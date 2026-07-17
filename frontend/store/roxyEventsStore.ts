import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  RoxyCategory,
  RoxyEvent,
  RoxyEventReminder,
} from '../data/roxyEvents';
import {
  cancelEventNotification,
  rescheduleEventNotification,
} from '../services/notificationsService';

const STORAGE_KEY = '@roxy/manual_events';

export type CreateRoxyEventInput = {
  title: string;
  date: string;
  time?: string;
  category: RoxyCategory;
  description?: string;
  reminder: RoxyEventReminder;
};

export type UpdateRoxyEventInput = CreateRoxyEventInput;

function createEventId() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEventInput(input: CreateRoxyEventInput): RoxyEvent {
  return {
    id: createEventId(),
    title: input.title.trim(),
    date: input.date,
    time: input.time?.trim() || undefined,
    category: input.category,
    status: 'pending',
    source: 'local',
    description: input.description?.trim() || undefined,
    reminder: input.reminder,
  };
}

function normalizeStoredEvent(event: RoxyEvent): RoxyEvent {
  return {
    ...event,
    source: 'local',
  };
}

function normalizeEventUpdate(
  currentEvent: RoxyEvent,
  input: UpdateRoxyEventInput
): RoxyEvent {
  return {
    ...currentEvent,
    title: input.title.trim(),
    date: input.date,
    time: input.time?.trim() || undefined,
    category: input.category,
    description: input.description?.trim() || undefined,
    reminder: input.reminder,
    source: 'local',
  };
}

export function useManualRoxyEvents() {
  const [events, setEvents] = useState<RoxyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const storedEvents = await AsyncStorage.getItem(STORAGE_KEY);

        if (!active || !storedEvents) {
          return;
        }

        const parsedEvents = JSON.parse(storedEvents);

        if (Array.isArray(parsedEvents)) {
          setEvents(parsedEvents.map(normalizeStoredEvent));
        }
      } catch (error) {
        console.warn('No se pudieron cargar los eventos manuales de Roxy.', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const persistEvents = useCallback(async (nextEvents: RoxyEvent[]) => {
    setEvents(nextEvents);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  }, []);

  const addEvent = useCallback(
    async (input: CreateRoxyEventInput) => {
      const nextEvent = await rescheduleEventNotification(
        normalizeEventInput(input)
      );
      const nextEvents = [...events, nextEvent];

      await persistEvents(nextEvents);

      return nextEvent;
    },
    [events, persistEvents]
  );

  const updateEvent = useCallback(
    async (eventId: string, input: UpdateRoxyEventInput) => {
      let updatedEvent: RoxyEvent | undefined;
      const nextEvents = await Promise.all(
        events.map(async (event) => {
          if (event.id !== eventId || event.source !== 'local') {
            return event;
          }

          updatedEvent = await rescheduleEventNotification(
            normalizeEventUpdate(event, input)
          );
          return updatedEvent;
        })
      );

      if (!updatedEvent) {
        return undefined;
      }

      await persistEvents(nextEvents);

      return updatedEvent;
    },
    [events, persistEvents]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      const eventToDelete = events.find(
        (event) => event.id === eventId && event.source === 'local'
      );

      if (!eventToDelete) {
        return false;
      }

      await cancelEventNotification(eventToDelete);
      await persistEvents(events.filter((event) => event.id !== eventId));

      return true;
    },
    [events, persistEvents]
  );

  return useMemo(
    () => ({
      events,
      isLoading,
      addEvent,
      updateEvent,
      deleteEvent,
    }),
    [addEvent, deleteEvent, events, isLoading, updateEvent]
  );
}
