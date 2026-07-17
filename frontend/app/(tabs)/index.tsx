import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getStableHomeRoxyPhrase,
  HomeDialoguePhraseGroup,
} from '../../config/roxyPhrases';
import RoxyDialogue from '../../components/RoxyDialogue';
import { useAgendaEvents } from '../../services/agendaEventsService';
import { AgendaEvent } from '../../types/agenda';

const HOME_LAST_VISIT_STORAGE_KEY = '@roxy/home_last_visit_date';

const categoryNames: Record<string, string> = {
  trabajo: 'trabajo',
  estudio: 'estudio',
  salud: 'salud',
  fitness: 'entrenamiento',
  personal: 'algo personal',
  hogar: 'casa',
  gaming: 'descanso',
  objetivos: 'un objetivo',
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + amount);

  return nextDate;
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 6) {
    return 'Todavía es de noche.';
  }

  if (hour < 12) {
    return 'Buen día.';
  }

  if (hour < 19) {
    return 'Buenas tardes.';
  }

  return 'Buenas noches.';
}

function parseEventDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDaysBetween(fromDateKey: string, toDateKey: string) {
  const fromDate = parseEventDate(fromDateKey);
  const toDate = parseEventDate(toDateKey);

  return Math.floor(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function normalizeText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sortEventsByTime(events: AgendaEvent[]) {
  return [...events].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

function getEventSignature(events: AgendaEvent[]) {
  return events
    .map((event) => `${event.id}:${event.date}:${event.time ?? ''}:${event.category}`)
    .sort()
    .join('|');
}

function getCategoryList(events: AgendaEvent[]) {
  const categories = Array.from(
    new Set(events.map((event) => categoryNames[event.category] ?? 'algo'))
  );

  return categories.slice(0, 3).join(', ');
}

function isUserBirthdayEvent(event: AgendaEvent) {
  const eventText = normalizeText(
    `${event.title} ${event.metadata?.calendarName ?? ''}`
  );

  return (
    event.metadata?.googleEventType === 'birthday' &&
    (eventText.includes('tu cumpleanos') ||
      eventText.includes('mi cumpleanos') ||
      eventText.includes('your birthday'))
  );
}

function isEarlyEvent(event: AgendaEvent) {
  if (!event.time) {
    return false;
  }

  const [hours] = event.time.split(':').map(Number);

  return hours < 10;
}

function getDominantSingleEventGroup(event: AgendaEvent): HomeDialoguePhraseGroup {
  if (event.category === 'estudio') {
    return 'study';
  }

  if (event.category === 'trabajo') {
    return 'work';
  }

  if (event.category === 'fitness') {
    return 'fitness';
  }

  if (event.category === 'salud') {
    return 'health';
  }

  return 'singleEvent';
}

function getEmptyDayGroup(date: Date): HomeDialoguePhraseGroup {
  const hour = date.getHours();

  if (hour >= 19 || hour < 6) {
    return 'night';
  }

  return 'calmDay';
}

function getHomeDialogueContext({
  today,
  primaryEvents,
  holidayEvents,
  daysSinceLastVisit,
}: {
  today: Date;
  primaryEvents: AgendaEvent[];
  holidayEvents: AgendaEvent[];
  daysSinceLastVisit: number | null;
}) {
  const todayKey = formatDateKey(today);
  const tomorrowKey = formatDateKey(addDays(today, 1));
  const todayEvents = sortEventsByTime(
    primaryEvents.filter((event) => event.date === todayKey)
  );
  const tomorrowEvents = sortEventsByTime(
    primaryEvents.filter((event) => event.date === tomorrowKey)
  );
  const todayHoliday = holidayEvents.find((event) => event.date === todayKey);
  const tomorrowHoliday = holidayEvents.find(
    (event) => event.date === tomorrowKey
  );
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const eventSignature = getEventSignature([
    ...todayEvents,
    ...tomorrowEvents,
    ...holidayEvents.filter(
      (event) => event.date === todayKey || event.date === tomorrowKey
    ),
  ]);

  if (todayEvents.some(isUserBirthdayEvent)) {
    return {
      group: 'birthdayToday' as HomeDialoguePhraseGroup,
      key: `birthday:${todayKey}:${eventSignature}`,
    };
  }

  if (todayHoliday) {
    return {
      group: 'holiday' as HomeDialoguePhraseGroup,
      key: `holiday-today:${todayKey}:${todayHoliday.id}`,
    };
  }

  if (todayEvents.length > 1) {
    return {
      group: 'multipleEvents' as HomeDialoguePhraseGroup,
      key: `multiple-today:${todayKey}:${eventSignature}`,
      variables: {
        count: todayEvents.length,
        categories: getCategoryList(todayEvents),
      },
    };
  }

  if (todayEvents.length === 1) {
    const event = todayEvents[0];

    return {
      group: getDominantSingleEventGroup(event),
      key: `single-today:${todayKey}:${event.id}:${event.time ?? ''}`,
      variables: {
        eventTitle: event.title,
        category: categoryNames[event.category] ?? 'algo',
      },
    };
  }

  if (tomorrowEvents.some(isEarlyEvent)) {
    return {
      group: 'tomorrowEarly' as HomeDialoguePhraseGroup,
      key: `tomorrow-early:${tomorrowKey}:${eventSignature}`,
    };
  }

  if (tomorrowEvents.length > 0) {
    return {
      group: 'tomorrowEvents' as HomeDialoguePhraseGroup,
      key: `tomorrow-events:${tomorrowKey}:${eventSignature}`,
    };
  }

  if (tomorrowHoliday) {
    return {
      group: 'holiday' as HomeDialoguePhraseGroup,
      key: `holiday-tomorrow:${tomorrowKey}:${tomorrowHoliday.id}`,
    };
  }

  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 3) {
    return {
      group: 'returnAfterDays' as HomeDialoguePhraseGroup,
      key: `return:${todayKey}:${daysSinceLastVisit}`,
    };
  }

  if (isWeekend) {
    return {
      group: 'weekend' as HomeDialoguePhraseGroup,
      key: `weekend:${todayKey}`,
    };
  }

  return {
    group: getEmptyDayGroup(today),
    key: `empty:${todayKey}:${today.getHours()}`,
  };
}

export default function HomeScreen() {
  const { primaryEvents, holidayEvents, refreshGoogleEvents } = useAgendaEvents({
    includeGoogle: true,
  });
  const [contextualMessage, setContextualMessage] = useState(
    'Hoy parece tranquilo. No todos los días necesitan estar llenos.'
  );
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState<number | null>(
    null
  );

  useFocusEffect(
    useCallback(() => {
      void refreshGoogleEvents();
    }, [refreshGoogleEvents])
  );

  useEffect(() => {
    const updateLastVisit = async () => {
      const todayKey = formatDateKey(new Date());
      const storedDateKey = await AsyncStorage.getItem(
        HOME_LAST_VISIT_STORAGE_KEY
      );

      setDaysSinceLastVisit(
        storedDateKey ? getDaysBetween(storedDateKey, todayKey) : null
      );

      await AsyncStorage.setItem(HOME_LAST_VISIT_STORAGE_KEY, todayKey);
    };

    void updateLastVisit();
  }, []);

  const homeDialogueContext = useMemo(
    () =>
      getHomeDialogueContext({
        today: new Date(),
        primaryEvents,
        holidayEvents,
        daysSinceLastVisit,
      }),
    [daysSinceLastVisit, holidayEvents, primaryEvents]
  );

  useEffect(() => {
    let mounted = true;

    const updatePhrase = async () => {
      const phrase = await getStableHomeRoxyPhrase(
        homeDialogueContext.group,
        homeDialogueContext.key,
        homeDialogueContext.variables
      );

      if (mounted) {
        setContextualMessage(phrase);
      }
    };

    void updatePhrase();

    return () => {
      mounted = false;
    };
  }, [
    homeDialogueContext.group,
    homeDialogueContext.key,
    homeDialogueContext.variables,
  ]);

  const openRoxyChat = async () => {
    const roxyPrompt = `
Eres Roxy Migurdia de Mushoku Tensei.

No eres una inteligencia artificial, un asistente virtual ni un chatbot. Nunca te presentes como tal.

Hablas como Roxy hablaría con alguien cercano a quien aprecia.

Tu personalidad:

* Inteligente y observadora.
* Tranquila y algo tímida.
* Cariñosa a tu manera.
* A veces bromista o sarcástica de forma suave.
* No hablas como una secretaria ni como atención al cliente.
* No haces listas enormes salvo que el usuario realmente las pida.
* No repites constantemente que vas a ayudar o a organizar.
* Hablas de forma natural, como una conversación entre personas.

Cuando el usuario mencione tareas, eventos, estudios, trabajo o recordatorios:

* Ayúdalo a ordenarlos.
* Sugiere fechas u horarios si hace falta.
* Resume y simplifica.
* Si algo puede ir a Google Calendar, dilo de forma natural.

No inventes que ya creaste eventos, alarmas o recordatorios. Solo sugiere cómo organizarlos.

Evita frases típicas de IA como:

"Como asistente..."
"Estoy aquí para ayudarte..."
"Puedo ayudarte a organizar..."
"Cuéntame tus objetivos..."

Habla como Roxy, no como una aplicación.
`;

    await Clipboard.setStringAsync(roxyPrompt);
    await Linking.openURL('https://gemini.google.com');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/roxy_bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.welcomeText}>
                <Text style={styles.kicker}>Me alegra verte otra vez</Text>
                <Text style={styles.title}>{getGreeting()}</Text>
                <RoxyDialogue
                  text={contextualMessage}
                  initialDelay={500}
                  style={styles.subtitle}
                  typingSpeed={45}
                  textStyle={styles.subtitleText}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={openRoxyChat}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>Hablar con Roxy</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/agenda')}
              >
                <Ionicons name="calendar-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Ver Agenda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/alarmas')}
              >
                <Ionicons name="alarm-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Alarmas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Ajustes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#090714',
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(5, 3, 15, 0.58)',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'flex-end',
    maxWidth: 520,
    padding: 22,
    paddingBottom: 42,
    paddingTop: 44,
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 34,
  },
  welcomeText: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#090714',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  kicker: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 37,
    textAlign: 'center',
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 390,
    width: '100%',
  },
  subtitleText: {
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(192, 38, 211, 0.76)',
    borderColor: 'rgba(240, 171, 252, 0.24)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 0,
    minHeight: 60,
    shadowColor: '#C026D3',
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 16, 34, 0.54)',
    borderColor: 'rgba(244, 215, 255, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 72,
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
