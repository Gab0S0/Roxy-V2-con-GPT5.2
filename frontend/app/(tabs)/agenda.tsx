import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import CalendarMonth from '../../components/CalendarMonth';
import { categoryConfig } from '../../config/categories';
import { getSelectedDayRadarMessage } from '../../config/roxyRadar';
import {
  RoxyCategory,
  RoxyEventReminder,
} from '../../data/roxyEvents';
import {
  useAgendaEvents,
  CreateRoxyEventInput,
  UpdateRoxyEventInput,
} from '../../services/agendaEventsService';
import { AgendaEvent } from '../../types/agenda';

const CATEGORY_OPTIONS: RoxyCategory[] = [
  'trabajo',
  'estudio',
  'salud',
  'fitness',
  'personal',
  'hogar',
  'gaming',
  'objetivos',
];

const REMINDER_OPTIONS: {
  value: RoxyEventReminder;
  label: string;
}[] = [
  { value: 'none', label: 'Sin recordatorio' },
  { value: 'same_day', label: 'El mismo día' },
  { value: 'one_day_before', label: '1 día antes' },
  { value: 'one_hour_before', label: '1 hora antes' },
];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseEventDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dateKey: string) {
  const date = parseEventDate(dateKey);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}`;
}

function formatSyncTime(date: Date | null) {
  if (!date) {
    return '';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getDaysUntil(dateKey: string) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const eventDate = parseEventDate(dateKey);

  return Math.ceil(
    (eventDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function normalizeAgendaText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function compareAgendaEventsByDateTime(a: AgendaEvent, b: AgendaEvent) {
  const dateDiff =
    parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime();

  if (dateDiff !== 0) {
    return dateDiff;
  }

  return (a.time ?? '').localeCompare(b.time ?? '');
}

function isGoogleBirthdayEvent(event: AgendaEvent) {
  if (event.source !== 'google') {
    return false;
  }

  const calendarIdentity = normalizeAgendaText(
    `${event.metadata?.googleCalendarId ?? ''} ${event.metadata?.calendarName ?? ''}`
  );

  return (
    event.metadata?.googleEventType === 'birthday' ||
    calendarIdentity.includes('birthday') ||
    calendarIdentity.includes('cumple') ||
    calendarIdentity.includes('#contacts')
  );
}

function shouldShowInUpcoming(event: AgendaEvent) {
  if (event.source === 'holiday' || event.visibility !== 'primary') {
    return false;
  }

  const daysUntil = getDaysUntil(event.date);

  if (daysUntil < 0 || daysUntil > 15) {
    return false;
  }

  if (isGoogleBirthdayEvent(event)) {
    return daysUntil <= 7;
  }

  return true;
}

function formatUpcomingGroupLabel(dateKey: string) {
  const daysUntil = getDaysUntil(dateKey);

  if (daysUntil === 0) {
    return 'Hoy';
  }

  if (daysUntil === 1) {
    return 'Mañana';
  }

  const date = parseEventDate(dateKey);

  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function groupEventsByDate(events: AgendaEvent[]) {
  return events.reduce<{ date: string; events: AgendaEvent[] }[]>(
    (groups, event) => {
      const existingGroup = groups.find((group) => group.date === event.date);

      if (existingGroup) {
        existingGroup.events.push(event);
        return groups;
      }

      groups.push({ date: event.date, events: [event] });
      return groups;
    },
    []
  );
}

function isEditableEvent(event: AgendaEvent) {
  return (
    (event.source === 'local' || event.source === 'google') &&
    !event.isReadOnly
  );
}

function getEventCategory(event: AgendaEvent) {
  return categoryConfig[event.category as keyof typeof categoryConfig];
}

function EventCard({
  event,
  onPress,
}: {
  event: AgendaEvent;
  onPress?: () => void;
}) {
  const category = getEventCategory(event);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventCard,
        { borderLeftColor: category.color },
        onPress && styles.editableCard,
        pressed && styles.pressedCard,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: category.bg }]}>
        <Ionicons name={category.icon} size={22} color={category.color} />
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventMetaRow}>
          <View style={[styles.categoryPill, { backgroundColor: category.bg }]}>
            <Text style={[styles.categoryText, { color: category.color }]}>
              {category.label}
            </Text>
          </View>

          {event.time ? <Text style={styles.eventTime}>{event.time}</Text> : null}
        </View>

        <Text style={styles.eventTitle}>{event.title}</Text>

        {event.description ? (
          <Text style={styles.eventDescription}>{event.description}</Text>
        ) : null}

        {onPress ? (
          <View style={styles.editHint}>
            <Ionicons name="create-outline" size={13} color="#C4B5FD" />
            <Text style={styles.editHintText}>Editar</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function UpcomingEventCard({
  event,
  onPress,
}: {
  event: AgendaEvent;
  onPress?: () => void;
}) {
  const category = getEventCategory(event);
  const daysUntil = getDaysUntil(event.date);
  const isSoon = daysUntil >= 0 && daysUntil <= 7;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.upcomingCard,
        pressed && styles.pressedCard,
      ]}
    >
      <View style={styles.upcomingDateBox}>
        <Text style={styles.upcomingDate}>{formatShortDate(event.date)}</Text>
        {event.time ? <Text style={styles.upcomingTime}>{event.time}</Text> : null}
      </View>

      <View style={[styles.upcomingIconBox, { backgroundColor: category.bg }]}>
        <Ionicons name={category.icon} size={20} color={category.color} />
      </View>

      <View style={styles.upcomingContent}>
        <View style={styles.upcomingMetaRow}>
          <Text style={[styles.upcomingCategory, { color: category.color }]}>
            {category.label}
          </Text>

          {isSoon ? (
            <View style={styles.soonChip}>
              <Text style={styles.soonChipText}>próximo</Text>
            </View>
          ) : null}

        </View>

        <Text style={styles.upcomingTitle}>{event.title}</Text>

        {daysUntil > 30 ? (
          <View style={styles.daysAwayChip}>
            <Ionicons name="time-outline" size={13} color="#F0ABFC" />
            <Text style={styles.daysAwayText}>faltan {daysUntil} días</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type EventFormModalProps = {
  visible: boolean;
  selectedDateKey: string;
  editingEvent?: AgendaEvent | null;
  onClose: () => void;
  onCreateEvent: (
    event: CreateRoxyEventInput,
    options?: { forceLocal?: boolean }
  ) => Promise<void>;
  onUpdateEvent: (
    eventId: string,
    event: UpdateRoxyEventInput
  ) => Promise<AgendaEvent | undefined>;
  onDeleteEvent: (eventId: string) => Promise<boolean>;
};

function EventFormModal({
  visible,
  selectedDateKey,
  editingEvent,
  onClose,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: EventFormModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDateKey);
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<RoxyCategory>('personal');
  const [description, setDescription] = useState('');
  const [reminder, setReminder] = useState<RoxyEventReminder>('none');
  const [error, setError] = useState('');
  const [canSaveLocalFallback, setCanSaveLocalFallback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(editingEvent);
  const isGoogleEvent = editingEvent?.source === 'google';

  useEffect(() => {
    if (visible) {
      setTitle(editingEvent?.title ?? '');
      setDate(editingEvent?.date ?? selectedDateKey);
      setTime(editingEvent?.time ?? '');
      setCategory((editingEvent?.category as RoxyCategory) ?? 'personal');
      setDescription(editingEvent?.description ?? '');
      setReminder(editingEvent?.reminder ?? 'none');
      setError('');
      setCanSaveLocalFallback(false);
      setIsSaving(false);
    }
  }, [editingEvent, selectedDateKey, visible]);

  const buildEventInput = () => ({
    title,
    date: date.trim(),
    time,
    category,
    description,
    reminder,
  });

  const validateEventInput = () => {
    if (!title.trim()) {
      setError('El titulo es necesario.');
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError('Usa una fecha con formato YYYY-MM-DD.');
      return false;
    }

    if (time.trim() && !/^\d{2}:\d{2}$/.test(time.trim())) {
      setError('Usa una hora con formato HH:mm.');
      return false;
    }

    return true;
  };

  const saveEventWithSync = async () => {
    if (!validateEventInput()) {
      return;
    }

    setError('');
    setCanSaveLocalFallback(false);
    setIsSaving(true);

    try {
      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, buildEventInput());
      } else {
        await onCreateEvent(buildEventInput());
      }

      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar este evento.'
      );
      setCanSaveLocalFallback(true);
    } finally {
      setIsSaving(false);
    }
  };

  const saveOnlyOnDevice = async () => {
    if (!validateEventInput()) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onCreateEvent(buildEventInput(), { forceLocal: true });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar este evento en este dispositivo.'
      );
    } finally {
      setIsSaving(false);
    }
  };


  const deleteCurrentEvent = async () => {
    if (!editingEvent) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const deleted = await onDeleteEvent(editingEvent.id);

      if (deleted) {
        onClose();
        return;
      }

      setError('No se pudo eliminar este evento.');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar este evento.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editingEvent || isSaving) {
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed =
        globalThis.window?.confirm?.(
          'Este evento local se quitará de tu Agenda.'
        ) ?? false;

      if (confirmed) {
        void deleteCurrentEvent();
      }

      return;
    }

    Alert.alert(
      'Eliminar evento',
      'Este evento local se quitará de tu Agenda.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteCurrentEvent();
          },
        },
      ]
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                {isGoogleEvent
                  ? 'Evento de Google'
                  : isEditing
                    ? 'Evento local'
                    : 'Nuevo evento'}
              </Text>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar evento' : 'Agregar evento'}
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <TextInput
            placeholder="Título"
            placeholderTextColor="#71717A"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <View style={styles.formRow}>
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#71717A"
              value={date}
              onChangeText={setDate}
              style={[styles.input, styles.flexInput]}
            />

            <TextInput
              placeholder="HH:mm"
              placeholderTextColor="#71717A"
              value={time}
              onChangeText={setTime}
              style={[styles.input, styles.timeInput]}
            />
          </View>

          <Text style={styles.formLabel}>Categoría</Text>
          <View style={styles.optionGrid}>
            {CATEGORY_OPTIONS.map((option) => {
              const optionConfig = categoryConfig[option];
              const selected = option === category;

              return (
                <Pressable
                  key={option}
                  onPress={() => setCategory(option)}
                  style={[
                    styles.optionChip,
                    selected && {
                      backgroundColor: optionConfig.bg,
                      borderColor: optionConfig.color,
                    },
                  ]}
                >
                  <Ionicons
                    name={optionConfig.icon}
                    size={15}
                    color={selected ? optionConfig.color : '#C4B5FD'}
                  />
                  <Text
                    style={[
                      styles.optionChipText,
                      selected && { color: optionConfig.color },
                    ]}
                  >
                    {optionConfig.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            multiline
            placeholder="Descripción opcional"
            placeholderTextColor="#71717A"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.descriptionInput]}
          />

          <Text style={styles.formLabel}>Recordatorio</Text>
          <View style={styles.reminderList}>
            {REMINDER_OPTIONS.map((option) => {
              const selected = option.value === reminder;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setReminder(option.value)}
                  style={[
                    styles.reminderChip,
                    selected && styles.selectedReminderChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.reminderText,
                      selected && styles.selectedReminderText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {canSaveLocalFallback ? (
            <Pressable
              disabled={isSaving}
              onPress={saveOnlyOnDevice}
              style={[
                styles.localFallbackButton,
                isSaving && styles.disabledButton,
              ]}
            >
              <Ionicons name="phone-portrait-outline" size={18} color="#F0ABFC" />
              <Text style={styles.localFallbackButtonText}>
                Guardar solo en este dispositivo
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            disabled={isSaving}
            onPress={saveEventWithSync}
            style={[styles.saveButton, isSaving && styles.disabledButton]}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isSaving
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Guardar evento'}
            </Text>
          </Pressable>

          {isEditing ? (
            <Pressable
              disabled={isSaving}
              onPress={confirmDelete}
              style={[styles.deleteButton, isSaving && styles.disabledButton]}
            >
              <Ionicons name="trash-outline" size={18} color="#FDA4AF" />
              <Text style={styles.deleteButtonText}>Eliminar evento</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const {
    allEvents,
    primaryEvents,
    holidayEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshGoogleEvents,
    isRefreshingGoogle,
    googleLastSync,
    googleError,
  } = useAgendaEvents({ includeGoogle: true });
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 820;

  useFocusEffect(
    useCallback(() => {
      void refreshGoogleEvents();
    }, [refreshGoogleEvents])
  );

  const selectedDateKey = useMemo(
    () => formatDateKey(selectedDate),
    [selectedDate]
  );

  const selectedHolidayEvents = useMemo(
    () => holidayEvents.filter((event) => event.date === selectedDateKey),
    [holidayEvents, selectedDateKey]
  );

  const selectedEvents = useMemo(
    () =>
      primaryEvents
        .filter((event) => event.date === selectedDateKey)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [primaryEvents, selectedDateKey]
  );

  const radarMessage = useMemo(
    () =>
      getSelectedDayRadarMessage({
        selectedDateKey,
        selectedEvents,
        selectedHolidayEvents,
        upcomingEvents: primaryEvents,
      }),
    [primaryEvents, selectedDateKey, selectedEvents, selectedHolidayEvents]
  );

  const upcomingEvents = useMemo(
    () =>
      primaryEvents
        .filter(shouldShowInUpcoming)
        .sort(compareAgendaEventsByDateTime),
    [primaryEvents]
  );

  const upcomingEventGroups = useMemo(
    () => groupEventsByDate(upcomingEvents),
    [upcomingEvents]
  );

  const createEvent = async (
    event: CreateRoxyEventInput,
    options?: { forceLocal?: boolean }
  ) => {
    const createdEvent = await addEvent(event, options);
    setSelectedDate(parseEventDate(createdEvent.date));
  };

  const updateLocalEvent = async (
    eventId: string,
    event: UpdateRoxyEventInput
  ) => {
    const updatedEvent = await updateEvent(eventId, event);

    if (updatedEvent) {
      setSelectedDate(parseEventDate(updatedEvent.date));
    }

    return updatedEvent;
  };

  const deleteLocalEvent = async (eventId: string) => {
    const deleted = await deleteEvent(eventId);

    if (deleted) {
      setEditingEvent(null);
    }

    return deleted;
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const openEditModal = (event: AgendaEvent) => {
    if (!isEditableEvent(event)) {
      return;
    }

    setEditingEvent(event);
    setShowEventForm(true);
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dashboard}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Agenda</Text>
              <Text style={styles.subtitle}>Veamos qué tenés por delante 💙</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                disabled={isRefreshingGoogle}
                accessibilityLabel="Sincronizar Google Calendar"
                style={[
                  styles.syncButton,
                  isRefreshingGoogle && styles.disabledButton,
                ]}
                onPress={() => {
                  void refreshGoogleEvents();
                }}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={isRefreshingGoogle ? '#A1A1AA' : '#F0ABFC'}
                />
              </Pressable>

              <Pressable
                style={styles.addEventButton}
                onPress={openCreateModal}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addEventButtonText}>Agregar evento</Text>
              </Pressable>
            </View>
          </View>

          {googleError || googleLastSync || isRefreshingGoogle ? (
            <View style={styles.syncStatusRow}>
              {googleError ? (
                <Text style={styles.syncErrorText}>
                  {googleError.includes('reconexion')
                    ? 'Google Calendar necesita reconexion desde Ajustes.'
                    : googleError}
                </Text>
              ) : (
                <Text style={styles.syncStatusText}>
                  {isRefreshingGoogle
                    ? 'Sincronizando Google Calendar...'
                    : `Google actualizado ${formatSyncTime(googleLastSync)}`}
                </Text>
              )}
            </View>
          ) : null}

          <View style={[styles.columns, isWideLayout && styles.columnsWide]}>
            <View style={[styles.leftColumn, isWideLayout && styles.leftColumnWide]}>
              <CalendarMonth
                events={allEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />

              <View style={styles.radarCard}>
                <View style={styles.radarIcon}>
                  <Ionicons name="sparkles" size={22} color="#F0ABFC" />
                </View>

                <View style={styles.radarContent}>
                  <Text style={styles.radarLabel}>Roxy dice</Text>
                  <Text style={styles.radarText}>{radarMessage}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.rightColumn, isWideLayout && styles.rightColumnWide]}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Eventos del día</Text>
                  <Text style={styles.dateBadge}>{selectedDateKey}</Text>
                </View>

                {selectedHolidayEvents.length > 0 ? (
                  <Text style={styles.holidayNote}>
                    Feriado:{' '}
                    {selectedHolidayEvents
                      .map((event) => event.title)
                      .join(', ')}
                  </Text>
                ) : null}

                {selectedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={
                      isEditableEvent(event)
                        ? () => openEditModal(event)
                        : undefined
                    }
                  />
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Próximos pendientes</Text>
                <Text style={styles.upcomingIntro}>
                  Estas son las cosas que no quiero que se te escapen.
                </Text>

                <View style={styles.upcomingList}>
                  {upcomingEventGroups.map((group) => (
                    <View key={group.date} style={styles.upcomingDayGroup}>
                      <Text style={styles.upcomingDayTitle}>
                        {formatUpcomingGroupLabel(group.date)}
                      </Text>

                      {group.events.map((event) => (
                        <UpcomingEventCard
                          key={event.id}
                          event={event}
                          onPress={
                            isEditableEvent(event)
                              ? () => openEditModal(event)
                              : undefined
                          }
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <EventFormModal
        visible={showEventForm}
        selectedDateKey={selectedDateKey}
        editingEvent={editingEvent}
        onClose={closeEventForm}
        onCreateEvent={createEvent}
        onUpdateEvent={updateLocalEvent}
        onDeleteEvent={deleteLocalEvent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090714',
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  dashboard: {
    maxWidth: 1120,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: '#F4D7FF',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  addEventButton: {
    alignItems: 'center',
    backgroundColor: '#C026D3',
    borderColor: 'rgba(240, 171, 252, 0.36)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 13,
  },
  addEventButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 16, 34, 0.86)',
    borderColor: 'rgba(240, 171, 252, 0.26)',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  syncStatusRow: {
    alignItems: 'flex-start',
    marginBottom: 14,
    marginTop: -10,
  },
  syncStatusText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  syncErrorText: {
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '800',
  },
  columns: {
    gap: 26,
  },
  columnsWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  leftColumn: {
    width: '100%',
  },
  leftColumnWide: {
    flex: 0.9,
    maxWidth: 460,
  },
  rightColumn: {
    width: '100%',
  },
  rightColumnWide: {
    flex: 1.18,
    minWidth: 0,
  },
  radarCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(22, 16, 34, 0.96)',
    borderColor: 'rgba(240, 171, 252, 0.30)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 17,
    shadowColor: '#C026D3',
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  radarIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(192, 38, 211, 0.22)',
    borderColor: 'rgba(240, 171, 252, 0.30)',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  radarContent: {
    flex: 1,
    minWidth: 0,
  },
  radarLabel: {
    color: '#F0ABFC',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  radarText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  dateBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderRadius: 999,
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  holidayNote: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(240, 171, 252, 0.08)',
    borderColor: 'rgba(240, 171, 252, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    color: '#F4D7FF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: -6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  eventCard: {
    backgroundColor: 'rgba(22, 16, 34, 0.96)',
    borderColor: 'rgba(255, 255, 255, 0.11)',
    borderLeftWidth: 3,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 15,
    marginBottom: 14,
    padding: 16,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  editableCard: {
    borderColor: 'rgba(196, 181, 253, 0.22)',
  },
  pressedCard: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
  },
  eventMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
  },
  eventTime: {
    color: '#F0ABFC',
    fontSize: 14,
    fontWeight: '800',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
  },
  eventDescription: {
    color: '#C9C3D6',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  editHint: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
  },
  editHintText: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  upcomingIntro: {
    color: '#C4B5FD',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    marginTop: -4,
  },
  upcomingList: {
    gap: 14,
  },
  upcomingDayGroup: {
    gap: 9,
  },
  upcomingDayTitle: {
    color: '#F0ABFC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  upcomingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 16, 34, 0.96)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 15,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  upcomingDateBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 7, 20, 0.86)',
    borderColor: 'rgba(240, 171, 252, 0.26)',
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 64,
    width: 66,
  },
  upcomingDate: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  upcomingTime: {
    color: '#F0ABFC',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  upcomingIconBox: {
    alignItems: 'center',
    borderRadius: 15,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  upcomingContent: {
    flex: 1,
    minWidth: 0,
  },
  upcomingMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 6,
  },
  upcomingCategory: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  soonChip: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.34)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonChipText: {
    color: '#86EFAC',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  daysAwayChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(192, 38, 211, 0.14)',
    borderColor: 'rgba(240, 171, 252, 0.34)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  daysAwayText: {
    color: '#F0ABFC',
    fontSize: 11,
    fontWeight: '900',
  },
  upcomingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 3, 15, 0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#161022',
    borderColor: 'rgba(240, 171, 252, 0.24)',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 560,
    padding: 18,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalEyebrow: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  input: {
    backgroundColor: 'rgba(9, 7, 20, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  flexInput: {
    flex: 1,
  },
  timeInput: {
    width: 104,
  },
  formLabel: {
    color: '#F4D7FF',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 9,
    marginTop: 14,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 7, 20, 0.52)',
    borderColor: 'rgba(196, 181, 253, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionChipText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionInput: {
    marginTop: 12,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  reminderList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    backgroundColor: 'rgba(9, 7, 20, 0.52)',
    borderColor: 'rgba(196, 181, 253, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedReminderChip: {
    backgroundColor: 'rgba(192, 38, 211, 0.20)',
    borderColor: '#F0ABFC',
  },
  reminderText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '800',
  },
  selectedReminderText: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#FB7185',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  localFallbackButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(192, 38, 211, 0.10)',
    borderColor: 'rgba(240, 171, 252, 0.28)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
  },
  localFallbackButtonText: {
    color: '#F0ABFC',
    fontSize: 13,
    fontWeight: '900',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.62,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.10)',
    borderColor: 'rgba(253, 164, 175, 0.28)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  deleteButtonText: {
    color: '#FDA4AF',
    fontSize: 14,
    fontWeight: '900',
  },
});
