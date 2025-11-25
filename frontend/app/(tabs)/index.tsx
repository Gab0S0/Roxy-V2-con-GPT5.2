import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import useAlarmasStore from '../../store/alarmasStore';

export default function AlarmScreen() {
  const { alarmas, loadAlarmas, deleteAlarma, toggleAlarma } = useAlarmasStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState(null);

  useEffect(() => {
    loadAlarmas();
  }, []);

  const handleDeleteAlarm = async (id: string) => {
    Alert.alert(
      'Eliminar Alarma',
      '¿Estás segura de que quieres eliminar esta alarma?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteAlarma(id);
          },
        },
      ]
    );
  };

  const renderAlarmItem = ({ item }) => {
    const time = format(parseISO(item.datetime), 'HH:mm', { locale: es });
    const date = format(parseISO(item.datetime), 'dd MMM yyyy', { locale: es });

    return (
      <View style={styles.alarmCard}>
        <View style={styles.alarmContent}>
          <View style={styles.alarmInfo}>
            <Text style={styles.alarmTime}>{time}</Text>
            <Text style={styles.alarmLabel}>{item.label}</Text>
            <Text style={styles.alarmDate}>{date}</Text>
            {item.repeatPattern && (
              <View style={styles.repeatBadge}>
                <Ionicons name="repeat" size={12} color="#4A90E2" />
                <Text style={styles.repeatText}>
                  {item.repeatPattern === 'daily' ? 'Diario' : 'Semanal'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.alarmActions}>
            <Switch
              value={item.isActive}
              onValueChange={() => toggleAlarma(item.id)}
              trackColor={{ false: '#3A3A3C', true: '#4A90E2' }}
              thumbColor={item.isActive ? '#FFFFFF' : '#8E8E93'}
            />
          </View>
        </View>

        <View style={styles.alarmButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setSelectedAlarm(item);
              setModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#4A90E2" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeleteAlarm(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {alarmas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alarm-outline" size={80} color="#3A3A3C" />
            <Text style={styles.emptyText}>No hay alarmas configuradas</Text>
            <Text style={styles.emptySubtext}>
              Crea una alarma o habla con Roxy para configurarlas 💙
            </Text>
          </View>
        ) : (
          <FlatList
            data={alarmas}
            renderItem={renderAlarmItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <TouchableOpacity
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

function AlarmModal({ visible, alarm, onClose }) {
  const { createAlarma, updateAlarma } = useAlarmasStore();
  const [label, setLabel] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatPattern, setRepeatPattern] = useState('none');
  const [repeatDays, setRepeatDays] = useState([]);

  const daysOfWeek = [
    { id: 'monday', label: 'Lun' },
    { id: 'tuesday', label: 'Mar' },
    { id: 'wednesday', label: 'Mié' },
    { id: 'thursday', label: 'Jue' },
    { id: 'friday', label: 'Vie' },
    { id: 'saturday', label: 'Sáb' },
    { id: 'sunday', label: 'Dom' },
  ];

  useEffect(() => {
    if (alarm) {
      setLabel(alarm.label);
      const dateObj = parseISO(alarm.datetime);
      setSelectedDate(dateObj);
      setSelectedTime(dateObj);
      setRepeatPattern(alarm.repeatPattern || 'none');
      setRepeatDays(alarm.repeatDays || []);
    } else {
      setLabel('');
      setSelectedDate(new Date());
      setSelectedTime(new Date());
      setRepeatPattern('none');
      setRepeatDays([]);
    }
  }, [alarm, visible]);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la alarma');
      return;
    }

    // Combinar fecha y hora
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();

    const combinedDate = new Date(year, month, day, hours, minutes);
    const datetime = combinedDate.toISOString();

    const alarmData = {
      label: label.trim(),
      datetime,
      repeatPattern: repeatPattern === 'none' ? null : repeatPattern,
      repeatDays: repeatPattern === 'custom' ? repeatDays : [],
      sound: 'default',
    };

    if (alarm) {
      await updateAlarma(alarm.id, alarmData);
    } else {
      await createAlarma(alarmData);
    }

    onClose();
  };

  const toggleDay = (dayId) => {
    if (repeatDays.includes(dayId)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayId));
    } else {
      setRepeatDays([...repeatDays, dayId]);
    }
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const onTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {alarm ? 'Editar Alarma' : 'Nueva Alarma'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ej: Gimnasio, Estudiar, Reunión"
              placeholderTextColor="#3A3A3C"
            />

            <Text style={styles.inputLabel}>Hora</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#4A90E2" />
              <Text style={styles.pickerButtonText}>
                {format(selectedTime, 'HH:mm')}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}

            <Text style={styles.inputLabel}>Fecha</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#4A90E2" />
              <Text style={styles.pickerButtonText}>
                {format(selectedDate, 'dd MMM yyyy', { locale: es })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.inputLabel}>Repetir</Text>
            <View style={styles.repeatOptions}>
              {['none', 'daily', 'weekly', 'custom'].map((pattern) => (
                <TouchableOpacity
                  key={pattern}
                  style={[
                    styles.repeatOption,
                    repeatPattern === pattern && styles.repeatOptionActive,
                  ]}
                  onPress={() => setRepeatPattern(pattern)}
                >
                  <Text
                    style={[
                      styles.repeatOptionText,
                      repeatPattern === pattern &&
                        styles.repeatOptionTextActive,
                    ]}
                  >
                    {pattern === 'none'
                      ? 'No'
                      : pattern === 'daily'
                      ? 'Diario'
                      : pattern === 'weekly'
                      ? 'Semanal'
                      : 'Personalizado'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {repeatPattern === 'custom' && (
              <View style={styles.daysContainer}>
                {daysOfWeek.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      repeatDays.includes(day.id) && styles.dayButtonActive,
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        repeatDays.includes(day.id) &&
                          styles.dayButtonTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  alarmCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  alarmContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alarmLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alarmDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  repeatText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 4,
  },
  alarmActions: {
    alignItems: 'flex-end',
  },
  alarmButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  pickerButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  repeatOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  repeatOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  repeatOptionActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  repeatOptionText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  repeatOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  dayButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
