import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import CalendarMonth from '../../components/CalendarMonth';
import { categoryConfig } from '../../config/categories';
import { getWeeklyRadarMessage } from '../../config/roxyRadar';
import { RoxyEvent, roxyEvents } from '../../data/roxyEvents';

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

function isPriorityCategory(event: RoxyEvent) {
  return event.category === 'salud' || event.category === 'estudio';
}

function EventCard({ event }: { event: RoxyEvent }) {
  const category = categoryConfig[event.category];

  return (
    <View style={[styles.eventCard, { borderLeftColor: category.color }]}>
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
      </View>
    </View>
  );
}

function UpcomingEventCard({ event }: { event: RoxyEvent }) {
  const category = categoryConfig[event.category];
  const daysUntil = getDaysUntil(event.date);
  const priority = isPriorityCategory(event);
  const isSoon = daysUntil >= 0 && daysUntil <= 7;

  return (
    <View
      style={[
        styles.upcomingCard,
        priority && styles.priorityUpcomingCard,
        isSoon && styles.soonUpcomingCard,
        { borderColor: priority ? category.color : 'rgba(255, 255, 255, 0.09)' },
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

          {priority ? (
            <View style={[styles.priorityChip, { backgroundColor: category.bg }]}>
              <Text style={[styles.priorityChipText, { color: category.color }]}>
                atento
              </Text>
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
    </View>
  );
}

export default function AgendaScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 820;

  const selectedDateKey = useMemo(
    () => formatDateKey(selectedDate),
    [selectedDate]
  );

  const selectedEvents = useMemo(
    () =>
      roxyEvents
        .filter((event) => event.date === selectedDateKey)
        .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [selectedDateKey]
  );

  const radarMessage = useMemo(() => getWeeklyRadarMessage(roxyEvents), []);

  const upcomingEvents = useMemo(
    () =>
      roxyEvents
        .filter((event) => getDaysUntil(event.date) >= 0)
        .sort((a, b) => {
          const dateDiff =
            parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime();

          if (dateDiff !== 0) {
            return dateDiff;
          }

          return (a.time ?? '').localeCompare(b.time ?? '');
        })
        .slice(0, 5),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.dashboard}>
          <View style={styles.header}>
            <Text style={styles.title}>Agenda</Text>
            <Text style={styles.subtitle}>Veamos qué tenés por delante 💙</Text>
          </View>

          <View style={[styles.columns, isWideLayout && styles.columnsWide]}>
            <View style={[styles.leftColumn, isWideLayout && styles.leftColumnWide]}>
              <CalendarMonth
                events={roxyEvents}
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

                {selectedEvents.length > 0 ? (
                  selectedEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="moon-outline" size={22} color="#C4B5FD" />
                    </View>

                    <View style={styles.emptyContent}>
                      <Text style={styles.emptyLabel}>Roxy dice</Text>
                      <Text style={styles.emptyText}>
                        Ese día parece tranquilo. Podemos usarlo para respirar un
                        poco o adelantar algo pendiente.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Próximos pendientes</Text>
                <Text style={styles.upcomingIntro}>
                  Estas son las cosas que no quiero que se te escapen.
                </Text>

                <View style={styles.upcomingList}>
                  {upcomingEvents.map((event) => (
                    <UpcomingEventCard key={event.id} event={event} />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 22,
    marginTop: 14,
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
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: '#161022',
    borderColor: 'rgba(196, 181, 253, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderColor: 'rgba(196, 181, 253, 0.24)',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyContent: {
    flex: 1,
    minWidth: 0,
  },
  emptyLabel: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#D4D4D8',
    fontSize: 15,
    lineHeight: 21,
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
  upcomingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 16, 34, 0.96)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 15,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  priorityUpcomingCard: {
    backgroundColor: 'rgba(22, 16, 34, 0.98)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  soonUpcomingCard: {
    backgroundColor: 'rgba(43, 26, 62, 0.88)',
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
  priorityChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityChipText: {
    fontSize: 10,
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
});
