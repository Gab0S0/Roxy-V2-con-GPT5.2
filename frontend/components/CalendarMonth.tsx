import React, { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { categoryConfig } from '../config/categories';
import { RoxyEvent } from '../data/roxyEvents';

type CalendarMonthProps = {
  events: RoxyEvent[];
  selectedDate: Date | string;
  onSelectDate: (date: Date) => void;
};

type CalendarDay = {
  key: string;
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: RoxyEvent[];
};

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function parseDate(value: Date | string) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    const fallback = new Date(value);
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate()
    );
  }

  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(
  visibleMonth: Date,
  selectedDate: Date,
  eventsByDate: Map<string, RoxyEvent[]>
) {
  const monthStart = startOfMonth(visibleMonth);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekday);

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const key = formatDateKey(date);

    return {
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      events: eventsByDate.get(key) ?? [],
    };
  });
}

export default function CalendarMonth({
  events,
  selectedDate,
  onSelectDate,
}: CalendarMonthProps) {
  const selected = useMemo(() => parseDate(selectedDate), [selectedDate]);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected));
  const monthTransition = React.useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    setVisibleMonth(startOfMonth(selected));
  }, [selected]);

  useEffect(() => {
    monthTransition.setValue(0);
    Animated.timing(monthTransition, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [monthTransition, visibleMonth]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, RoxyEvent[]>();

    events.forEach((event) => {
      const dateEvents = grouped.get(event.date) ?? [];
      grouped.set(event.date, [...dateEvents, event]);
    });

    return grouped;
  }, [events]);

  const days = useMemo(
    () => getCalendarDays(visibleMonth, selected, eventsByDate),
    [visibleMonth, selected, eventsByDate]
  );
  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, weekIndex) =>
        days.slice(weekIndex * 7, weekIndex * 7 + 7)
      ),
    [days]
  );

  const compact = width < 380;
  const monthLabel = `${MONTH_LABELS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`;
  const monthScale = monthTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1],
  });

  return (
    <View style={styles.cardShell}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Mes anterior"
            onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
            style={({ pressed }) => [
              styles.monthButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color="#F4D7FF" />
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.kicker}>Calendario</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={styles.monthTitle}
            >
              {monthLabel}
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Mes siguiente"
            onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
            style={({ pressed }) => [
              styles.monthButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Ionicons name="chevron-forward" size={18} color="#F4D7FF" />
          </Pressable>
        </View>

        <View style={styles.weekdays}>
          {WEEKDAY_LABELS.map((weekday, index) => (
            <Text key={`${weekday}-${index}`} style={styles.weekday}>
              {weekday}
            </Text>
          ))}
        </View>

        <Animated.View
          style={[
            styles.grid,
            compact && styles.compactGrid,
            {
              opacity: monthTransition,
              transform: [{ scale: monthScale }],
            },
          ]}
        >
          {weeks.map((week, weekIndex) => (
            <View
              key={`week-${weekIndex}`}
              style={[styles.weekRow, compact && styles.compactWeekRow]}
            >
              {week.map((day) => {
                const visibleEvents = day.events.slice(0, 3);
                const hiddenCount = day.events.length - visibleEvents.length;
                const hasEvents = day.events.length > 0;
                const isBusy = day.events.length >= 2;
                const isVeryBusy = day.events.length >= 3;

                return (
                  <Pressable
                    key={day.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${day.dayNumber} de ${
                      MONTH_LABELS[day.date.getMonth()]
                    }`}
                    onPress={() => onSelectDate(day.date)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      compact && styles.compactDayCell,
                      hasEvents && styles.eventDayCell,
                      isBusy && styles.busyDayCell,
                      isVeryBusy && styles.veryBusyDayCell,
                      !day.isCurrentMonth && styles.outsideMonthCell,
                      day.isToday && styles.todayCell,
                      day.isSelected && styles.selectedCell,
                      pressed && styles.pressedDay,
                    ]}
                  >
                    <View
                      style={[
                        styles.dayNumberBubble,
                        day.isToday && styles.todayNumberBubble,
                        day.isSelected && styles.selectedNumberBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          !day.isCurrentMonth && styles.outsideMonthText,
                          day.isToday && styles.todayText,
                          day.isSelected && styles.selectedText,
                        ]}
                      >
                        {day.dayNumber}
                      </Text>
                    </View>

                    <View style={styles.indicatorsRow}>
                      {visibleEvents.map((event) => {
                        const category = categoryConfig[event.category];

                        return (
                          <View
                            key={`${day.key}-${event.id}`}
                            style={[
                              styles.eventDot,
                              { backgroundColor: category.color },
                              isBusy && styles.busyEventDot,
                              !day.isCurrentMonth && styles.outsideMonthDot,
                            ]}
                          />
                        );
                      })}

                      {hiddenCount > 0 ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.moreText,
                            !day.isCurrentMonth && styles.outsideMonthText,
                          ]}
                        >
                          +{hiddenCount}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    alignSelf: 'center',
    maxWidth: 430,
    width: '100%',
  },
  card: {
    backgroundColor: '#161022',
    borderColor: 'rgba(240, 171, 252, 0.26)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    borderColor: 'rgba(244, 215, 255, 0.20)',
    borderRadius: 13,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressedButton: {
    backgroundColor: 'rgba(192, 38, 211, 0.28)',
    transform: [{ scale: 0.98 }],
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekday: {
    color: '#A1A1AA',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  grid: {
    gap: 4,
  },
  compactGrid: {
    gap: 3,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  compactWeekRow: {
    gap: 3,
  },
  dayCell: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 7, 20, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    height: 46,
    justifyContent: 'space-between',
    paddingHorizontal: 3,
    paddingVertical: 5,
  },
  eventDayCell: {
    backgroundColor: 'rgba(21, 16, 35, 0.96)',
    borderColor: 'rgba(240, 171, 252, 0.18)',
  },
  busyDayCell: {
    backgroundColor: 'rgba(48, 29, 70, 0.72)',
    borderColor: 'rgba(192, 38, 211, 0.34)',
  },
  veryBusyDayCell: {
    shadowColor: '#C026D3',
    shadowOpacity: 0.26,
    shadowRadius: 8,
  },
  compactDayCell: {
    borderRadius: 10,
    height: 42,
    paddingVertical: 4,
  },
  outsideMonthCell: {
    backgroundColor: 'rgba(9, 7, 20, 0.32)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  todayCell: {
    backgroundColor: 'rgba(139, 92, 246, 0.34)',
    borderColor: '#C4B5FD',
    borderWidth: 2,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.48,
    shadowRadius: 14,
  },
  selectedCell: {
    backgroundColor: 'rgba(192, 38, 211, 0.22)',
    borderColor: '#F0ABFC',
    borderWidth: 2,
  },
  pressedDay: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  dayNumberBubble: {
    alignItems: 'center',
    borderRadius: 999,
    height: 19,
    justifyContent: 'center',
    minWidth: 19,
    paddingHorizontal: 4,
  },
  todayNumberBubble: {
    backgroundColor: '#8B5CF6',
  },
  selectedNumberBubble: {
    backgroundColor: '#C026D3',
  },
  dayNumber: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  outsideMonthText: {
    color: '#52525B',
  },
  todayText: {
    color: '#FFFFFF',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  indicatorsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    height: 13,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  eventDot: {
    borderColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 999,
    borderWidth: 1,
    height: 7,
    width: 10,
  },
  busyEventDot: {
    height: 8,
    width: 12,
  },
  outsideMonthDot: {
    opacity: 0.34,
  },
  moreText: {
    backgroundColor: 'rgba(240, 171, 252, 0.16)',
    borderRadius: 999,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
    overflow: 'hidden',
    paddingHorizontal: 3,
  },
});
