import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  ListRenderItem,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  canScheduleExactAlarms,
  requestExactAlarmPermission,
  scheduleTestAlarm,
} from '../../services/androidAlarmService';
import useAlarmasStore from '../../store/alarmasStore';
import type { RoxyAlarm, RoxyAlarmSound } from '../../types/alarm';

const dayOptions = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mie' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sab' },
  { id: 0, label: 'Dom' },
];

const formatTime = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

const getRepeatLabel = (repeatDays: number[]) => {
  if (repeatDays.length === 0) {
    return 'Una vez';
  }

  if (repeatDays.length === 7) {
    return 'Todos los dias';
  }

  return dayOptions
    .filter((day) => repeatDays.includes(day.id))
    .map((day) => day.label)
    .join(', ');
};

const confirmDelete = (label: string, onConfirm: () => void) => {
  const message = `Eliminar "${label}"?`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert('Eliminar alarma', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
  ]);
};

export default function AlarmScreen() {
  const { alarmas, error, isLoading, loadAlarmas, deleteAlarma, toggleAlarma } = useAlarmasStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<RoxyAlarm | null>(null);
  const [testAlarmStatus, setTestAlarmStatus] = useState<string | null>(null);
  const [isSchedulingTestAlarm, setIsSchedulingTestAlarm] = useState(false);
  const waitingForExactAlarmPermission = useRef(false);

  useEffect(() => {
    void loadAlarmas();
  }, [loadAlarmas]);

  const programTestAlarm = useCallback(async () => {
    setIsSchedulingTestAlarm(true);
    try {
      const triggerAtMillis = Date.now() + 2 * 60 * 1000;
      await scheduleTestAlarm(triggerAtMillis);
      const triggerTime = new Date(triggerAtMillis).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setTestAlarmStatus(`Alarma de prueba programada para las ${triggerTime}.`);
    } catch (scheduleError) {
      console.error('Error scheduling native test alarm:', scheduleError);
      setTestAlarmStatus('No pude programar la alarma de prueba. Revisa los permisos de Android.');
    } finally {
      setIsSchedulingTestAlarm(false);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !waitingForExactAlarmPermission.current) {
        return;
      }

      waitingForExactAlarmPermission.current = false;
      void canScheduleExactAlarms()
        .then((canSchedule) => {
          if (canSchedule) {
            void programTestAlarm();
            return;
          }
          setTestAlarmStatus('Android no concedió el permiso de alarmas exactas.');
        })
        .catch((permissionError) => {
          console.error('Error checking exact alarm permission:', permissionError);
          setTestAlarmStatus('No pude comprobar el permiso de alarmas exactas.');
        });
    });

    return () => subscription.remove();
  }, [programTestAlarm]);

  const handleTestAlarm = async () => {
    if (Platform.OS !== 'android') {
      setTestAlarmStatus('Esta prueba requiere una development build Android.');
      return;
    }

    setIsSchedulingTestAlarm(true);
    setTestAlarmStatus(null);
    try {
      let notificationPermission = await Notifications.getPermissionsAsync();
      if (notificationPermission.status !== 'granted') {
        notificationPermission = await Notifications.requestPermissionsAsync();
      }

      if (notificationPermission.status !== 'granted') {
        setTestAlarmStatus('Hace falta permitir notificaciones para ver la alarma de prueba.');
        return;
      }

      if (await canScheduleExactAlarms()) {
        await programTestAlarm();
        return;
      }

      waitingForExactAlarmPermission.current = true;
      setTestAlarmStatus('Concede el permiso de alarmas exactas en Android.');
      await requestExactAlarmPermission();
    } catch (permissionError) {
      console.error('Error preparing native test alarm:', permissionError);
      setTestAlarmStatus('No pude abrir o comprobar los permisos de alarma.');
    } finally {
      setIsSchedulingTestAlarm(false);
    }
  };

  const sortedAlarmas = useMemo(
    () => [...alarmas].sort((a, b) => a.hour - b.hour || a.minute - b.minute),
    [alarmas]
  );

  const renderAlarmItem: ListRenderItem<RoxyAlarm> = ({ item }) => (
    <View style={[styles.alarmCard, !item.enabled && styles.alarmCardDisabled]}>
      <View style={styles.alarmContent}>
        <View style={styles.alarmInfo}>
          <Text style={[styles.alarmTime, !item.enabled && styles.mutedText]}>
            {formatTime(item.hour, item.minute)}
          </Text>
          <Text style={[styles.alarmLabel, !item.enabled && styles.mutedText]}>{item.label}</Text>

          <View style={styles.metaRow}>
            <View style={styles.repeatBadge}>
              <Ionicons name="repeat" size={13} color="#C026D3" />
              <Text style={styles.repeatText}>{getRepeatLabel(item.repeatDays)}</Text>
            </View>
            <View style={styles.repeatBadge}>
              <Ionicons name="bed-outline" size={13} color="#8B5CF6" />
              <Text style={styles.repeatText}>{item.snoozeMinutes} min</Text>
            </View>
            {item.vibrate && (
              <View style={styles.repeatBadge}>
                <Ionicons name="phone-portrait-outline" size={13} color="#8B5CF6" />
                <Text style={styles.repeatText}>Vibra</Text>
              </View>
            )}
          </View>
        </View>

        <Switch
          value={item.enabled}
          onValueChange={() => void toggleAlarma(item.id)}
          trackColor={{ false: '#362943', true: '#7C3AED' }}
          thumbColor={item.enabled ? '#F5D0FE' : '#8B7A99'}
        />
      </View>

      <View style={styles.alarmButtons}>
        <TouchableOpacity
          accessibilityLabel="Editar alarma"
          style={styles.iconButton}
          onPress={() => {
            setSelectedAlarm(item);
            setModalVisible(true);
          }}
        >
          <Ionicons name="create-outline" size={20} color="#C026D3" />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Eliminar alarma"
          style={styles.iconButton}
          onPress={() => confirmDelete(item.label, () => void deleteAlarma(item.id))}
        >
          <Ionicons name="trash-outline" size={20} color="#FB7185" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alarmas</Text>
        <Text style={styles.subtitle}>Un recordatorio simple, guardado en este dispositivo.</Text>
      </View>

      <View style={styles.devNotice}>
        <Ionicons name="construct-outline" size={16} color="#F0ABFC" />
        <Text style={styles.devNoticeText}>Motor de alarma Android en prueba técnica.</Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={isSchedulingTestAlarm}
        style={[styles.testButton, isSchedulingTestAlarm && styles.testButtonDisabled]}
        onPress={() => void handleTestAlarm()}
      >
        <Ionicons name="timer-outline" size={18} color="#F5D0FE" />
        <Text style={styles.testButtonText}>
          {isSchedulingTestAlarm ? 'Preparando prueba...' : 'Probar alarma en 2 minutos'}
        </Text>
      </TouchableOpacity>
      {testAlarmStatus && <Text style={styles.testAlarmStatus}>{testAlarmStatus}</Text>}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.content}>
        {sortedAlarmas.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={68} color="#6B5B78" />
            <Text style={styles.emptyText}>Todavia no hay alarmas.</Text>
            <Text style={styles.emptySubtext}>
              Podemos dejar preparada una. El disparo real se conectara en la fase Android.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedAlarmas}
            renderItem={renderAlarmItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <TouchableOpacity
        accessibilityLabel="Agregar alarma"
        style={styles.fab}
        onPress={() => {
          setSelectedAlarm(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <AlarmModal
        visible={modalVisible}
        alarm={selectedAlarm}
        onClose={() => {
          setModalVisible(false);
          setSelectedAlarm(null);
        }}
      />
    </SafeAreaView>
  );
}

interface AlarmModalProps {
  visible: boolean;
  alarm: RoxyAlarm | null;
  onClose: () => void;
}

interface DigitalTimePickerProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

function DigitalTimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: DigitalTimePickerProps) {
  const [hourText, setHourText] = useState(hour.toString().padStart(2, '0'));
  const [minuteText, setMinuteText] = useState(minute.toString().padStart(2, '0'));

  useEffect(() => setHourText(hour.toString().padStart(2, '0')), [hour]);
  useEffect(() => setMinuteText(minute.toString().padStart(2, '0')), [minute]);

  const commitValue = (
    text: string,
    maximum: number,
    updateText: (value: string) => void,
    updateValue: (value: number) => void
  ) => {
    const parsed = Number.parseInt(text, 10);
    const value = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), maximum);
    updateText(value.toString().padStart(2, '0'));
    updateValue(value);
  };

  const changeText = (
    text: string,
    maximum: number,
    updateText: (value: string) => void,
    updateValue: (value: number) => void
  ) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    updateText(digits);
    if (digits.length > 0) {
      updateValue(Math.min(Number.parseInt(digits, 10), maximum));
    }
  };

  const renderTimeColumn = ({
    label,
    value,
    text,
    maximum,
    onChange,
    onTextChange,
  }: {
    label: string;
    value: number;
    text: string;
    maximum: number;
    onChange: (value: number) => void;
    onTextChange: (value: string) => void;
  }) => (
    <View style={styles.timeColumn}>
      <TouchableOpacity
        accessibilityLabel={`Aumentar ${label.toLowerCase()}`}
        style={styles.timeStepButton}
        onPress={() => onChange((value + 1) % (maximum + 1))}
      >
        <Ionicons name="chevron-up" size={24} color="#E879F9" />
      </TouchableOpacity>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        style={styles.timeInput}
        value={text}
        onBlur={() => commitValue(text, maximum, onTextChange, onChange)}
        onChangeText={(nextText) => changeText(nextText, maximum, onTextChange, onChange)}
      />
      <TouchableOpacity
        accessibilityLabel={`Disminuir ${label.toLowerCase()}`}
        style={styles.timeStepButton}
        onPress={() => onChange((value - 1 + maximum + 1) % (maximum + 1))}
      >
        <Ionicons name="chevron-down" size={24} color="#E879F9" />
      </TouchableOpacity>
      <Text style={styles.timeUnitLabel}>{label}</Text>
    </View>
  );

  return (
    <View>
      <View style={styles.digitalTimePicker}>
        {renderTimeColumn({
          label: 'Horas',
          value: hour,
          text: hourText,
          maximum: 23,
          onChange: onHourChange,
          onTextChange: setHourText,
        })}
        <Text style={styles.timeSeparator}>:</Text>
        {renderTimeColumn({
          label: 'Minutos',
          value: minute,
          text: minuteText,
          maximum: 59,
          onChange: onMinuteChange,
          onTextChange: setMinuteText,
        })}
      </View>
      <Text style={styles.timeFormatHint}>Formato 24 horas · 00–23 / 00–59</Text>
    </View>
  );
}

function AlarmModal({ visible, alarm, onClose }: AlarmModalProps) {
  const { createAlarma, updateAlarma } = useAlarmasStore();
  const [label, setLabel] = useState('');
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [vibrate, setVibrate] = useState(true);
  const [sound, setSound] = useState<RoxyAlarmSound>('default');

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (alarm) {
      setLabel(alarm.label);
      setHour(alarm.hour);
      setMinute(alarm.minute);
      setRepeatDays(alarm.repeatDays);
      setSnoozeMinutes(alarm.snoozeMinutes);
      setVibrate(alarm.vibrate);
      setSound(alarm.sound);
      return;
    }

    const now = new Date();
    setLabel('');
    setHour(now.getHours());
    setMinute(now.getMinutes());
    setRepeatDays([]);
    setSnoozeMinutes(5);
    setVibrate(true);
    setSound('default');
  }, [alarm, visible]);

  const toggleDay = (dayId: number) => {
    setRepeatDays((currentDays) =>
      currentDays.includes(dayId)
        ? currentDays.filter((day) => day !== dayId)
        : [...currentDays, dayId].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      Alert.alert('Falta un nombre', 'Dale una etiqueta breve a la alarma.');
      return;
    }

    const alarmData = {
      label: trimmedLabel,
      hour,
      minute,
      enabled: alarm?.enabled ?? true,
      repeatDays,
      snoozeMinutes,
      sound,
      vibrate,
    };

    if (alarm) {
      await updateAlarma(alarm.id, alarmData);
    } else {
      await createAlarma(alarmData);
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{alarm ? 'Editar alarma' : 'Nueva alarma'}</Text>
            <TouchableOpacity accessibilityLabel="Cerrar modal" onPress={onClose}>
              <Ionicons name="close" size={28} color="#B9A7C8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Etiqueta</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ej: Estudiar, medicacion, gimnasio"
              placeholderTextColor="#7C6A8C"
            />

            <Text style={styles.inputLabel}>Hora</Text>
            <DigitalTimePicker
              hour={hour}
              minute={minute}
              onHourChange={setHour}
              onMinuteChange={setMinute}
            />

            <Text style={styles.inputLabel}>Repeticion semanal</Text>
            <Text style={styles.helperText}>
              Sin dias elegidos queda como alarma unica para la proxima ocurrencia.
            </Text>
            <View style={styles.daysContainer}>
              {dayOptions.map((day) => {
                const isActive = repeatDays.includes(day.id);
                return (
                  <TouchableOpacity
                    key={day.id}
                    style={[styles.dayButton, isActive && styles.dayButtonActive]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Posponer</Text>
            <View style={styles.snoozeRow}>
              {[5, 10, 15].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.snoozeButton, snoozeMinutes === minutes && styles.snoozeButtonActive]}
                  onPress={() => setSnoozeMinutes(minutes)}
                >
                  <Text
                    style={[
                      styles.snoozeButtonText,
                      snoozeMinutes === minutes && styles.snoozeButtonTextActive,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Vibracion</Text>
                <Text style={styles.helperText}>Quedara lista para el motor Android.</Text>
              </View>
              <Switch
                value={vibrate}
                onValueChange={setVibrate}
                trackColor={{ false: '#362943', true: '#7C3AED' }}
                thumbColor={vibrate ? '#F5D0FE' : '#8B7A99'}
              />
            </View>

            <Text style={styles.inputLabel}>Sonido</Text>
            <View style={styles.soundRow}>
              {(['default', 'roxy_theme'] as RoxyAlarmSound[]).map((option) => {
                const isActive = sound === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.soundButton, isActive && styles.soundButtonActive]}
                    onPress={() => setSound(option)}
                  >
                    <Text style={[styles.soundButtonText, isActive && styles.soundButtonTextActive]}>
                      {option === 'default' ? 'Default' : 'Roxy theme'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090714',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#B9A7C8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  devNotice: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(192, 38, 211, 0.11)',
    borderColor: 'rgba(192, 38, 211, 0.28)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devNoticeText: {
    color: '#F5D0FE',
    flex: 1,
    fontSize: 13,
  },
  testButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'rgba(139, 92, 246, 0.52)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testButtonDisabled: {
    opacity: 0.55,
  },
  testButtonText: {
    color: '#F5D0FE',
    fontSize: 13,
    fontWeight: '700',
  },
  testAlarmStatus: {
    color: '#C4B5FD',
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 20,
    marginTop: 8,
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 110,
  },
  alarmCard: {
    backgroundColor: '#161022',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(192, 38, 211, 0.26)',
  },
  alarmCardDisabled: {
    borderColor: 'rgba(185, 167, 200, 0.12)',
    opacity: 0.72,
  },
  alarmContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },
  alarmLabel: {
    color: '#F7ECFF',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 2,
  },
  mutedText: {
    color: '#8B7A99',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  repeatBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.13)',
    borderColor: 'rgba(139, 92, 246, 0.22)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  repeatText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  alarmButtons: {
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
  },
  iconButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#B9A7C8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#C026D3',
    borderRadius: 32,
    bottom: 24,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#C026D3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    width: 64,
  },
  modalOverlay: {
    backgroundColor: 'rgba(3, 2, 8, 0.78)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161022',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  modalBody: {
    marginBottom: 22,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
  },
  helperText: {
    color: '#A995B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#21182E',
    borderColor: 'rgba(185, 167, 200, 0.16)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 16,
    padding: 15,
  },
  digitalTimePicker: {
    alignItems: 'center',
    backgroundColor: '#21182E',
    borderColor: 'rgba(192, 38, 211, 0.22)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  timeColumn: {
    alignItems: 'center',
    flex: 1,
  },
  timeStepButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  timeInput: {
    backgroundColor: '#120D1B',
    borderColor: 'rgba(232, 121, 249, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 44,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
  },
  timeSeparator: {
    color: '#E9D5FF',
    fontSize: 40,
    fontWeight: '800',
    marginHorizontal: 6,
  },
  timeUnitLabel: {
    color: '#A995B8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  timeFormatHint: {
    color: '#A995B8',
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    alignItems: 'center',
    backgroundColor: '#21182E',
    borderColor: 'rgba(185, 167, 200, 0.16)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  dayButtonActive: {
    backgroundColor: 'rgba(192, 38, 211, 0.24)',
    borderColor: '#C026D3',
  },
  dayButtonText: {
    color: '#B9A7C8',
    fontSize: 12,
    fontWeight: '700',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  snoozeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  snoozeButton: {
    backgroundColor: '#21182E',
    borderColor: 'rgba(185, 167, 200, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  snoozeButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.24)',
    borderColor: '#8B5CF6',
  },
  snoozeButtonText: {
    color: '#B9A7C8',
    fontSize: 13,
    fontWeight: '700',
  },
  snoozeButtonTextActive: {
    color: '#FFFFFF',
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  soundRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  soundButton: {
    backgroundColor: '#21182E',
    borderColor: 'rgba(185, 167, 200, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  soundButtonActive: {
    backgroundColor: 'rgba(192, 38, 211, 0.2)',
    borderColor: '#C026D3',
  },
  soundButtonText: {
    color: '#B9A7C8',
    fontSize: 13,
    fontWeight: '700',
  },
  soundButtonTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#C026D3',
    borderRadius: 16,
    padding: 17,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
