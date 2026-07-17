import { useCallback, useMemo, useState } from 'react';

import { RoxyEvent } from '../data/roxyEvents';
import {
  CreateRoxyEventInput,
  UpdateRoxyEventInput,
  useManualRoxyEvents,
} from '../store/roxyEventsStore';
import { AgendaEvent, AgendaEventSource } from '../types/agenda';
import {
  createGoogleEvent,
  deleteGoogleEvent,
  fetchGoogleEvents,
  getCurrentGoogleAccount,
  updateGoogleEvent,
} from './googleCalendarService';

function normalizeRoxySource(event: RoxyEvent): AgendaEventSource {
  if (event.source === 'local' || event.source === 'google') {
    return event.source;
  }

  return 'system';
}

function normalizeRoxyEvent(
  event: RoxyEvent,
  options?: { isReadOnly?: boolean }
): AgendaEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    category: event.category,
    source: normalizeRoxySource(event),
    visibility: 'primary',
    description: event.description,
    reminder: event.reminder,
    status: event.status,
    isReadOnly: options?.isReadOnly ?? event.source !== 'local',
    notificationId: event.notificationId,
  };
}

function getAgendaEventDedupeKey(event: AgendaEvent) {
  if (event.dedupeKey) {
    return event.dedupeKey;
  }

  if (event.externalId) {
    return `${event.source}:${event.externalId}`;
  }

  return `${event.source}:${event.id}`;
}

function dedupeAgendaEvents(events: AgendaEvent[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = getAgendaEventDedupeKey(event);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

type UseAgendaEventsOptions = {
  includeGoogle?: boolean;
};

type SaveAgendaEventOptions = {
  forceLocal?: boolean;
};

export function useAgendaEvents({
  includeGoogle = false,
}: UseAgendaEventsOptions = {}) {
  const {
    events: localEvents,
    isLoading,
    addEvent: addLocalEvent,
    updateEvent: updateLocalEvent,
    deleteEvent: deleteLocalEvent,
  } = useManualRoxyEvents();
  const [googleEvents, setGoogleEvents] = useState<AgendaEvent[]>([]);
  const [googleHolidayEvents, setGoogleHolidayEvents] = useState<AgendaEvent[]>([]);
  const [isRefreshingGoogle, setIsRefreshingGoogle] = useState(false);
  const [googleLastSync, setGoogleLastSync] = useState<Date | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const refreshGoogleEvents = useCallback(async () => {
    if (!includeGoogle) {
      setGoogleEvents([]);
      setGoogleHolidayEvents([]);
      setGoogleError(null);
      return;
    }

    setIsRefreshingGoogle(true);
    setGoogleError(null);

    try {
      const account = await getCurrentGoogleAccount();

      if (!account?.accessToken) {
        setGoogleEvents([]);
        setGoogleHolidayEvents([]);
        setGoogleLastSync(null);
        return;
      }

      const events = await fetchGoogleEvents({
        accessToken: account.accessToken,
      });
      const primaryGoogleEvents = events.filter(
        (event) => event.visibility === 'primary'
      );
      const subtleGoogleEvents = events.filter(
        (event) => event.visibility === 'subtle'
      );

      setGoogleEvents(primaryGoogleEvents);
      setGoogleHolidayEvents(subtleGoogleEvents);
      setGoogleLastSync(new Date());
    } catch (error) {
      console.warn('No se pudieron cargar eventos de Google Calendar.', error);
      setGoogleError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar eventos de Google Calendar.'
      );
    } finally {
      setIsRefreshingGoogle(false);
    }
  }, [includeGoogle]);

  const normalizedLocalEvents = useMemo(
    () => localEvents.map((event) => normalizeRoxyEvent(event)),
    [localEvents]
  );

  const primaryEvents = useMemo(
    () => dedupeAgendaEvents([...normalizedLocalEvents, ...googleEvents]),
    [googleEvents, normalizedLocalEvents]
  );

  const subtleEvents = useMemo(
    () => googleHolidayEvents.filter((event) => event.visibility === 'subtle'),
    [googleHolidayEvents]
  );

  const allEvents = useMemo(
    () => [...primaryEvents, ...subtleEvents],
    [primaryEvents, subtleEvents]
  );

  const updateEvent = useCallback(
    async (eventId: string, input: UpdateRoxyEventInput) => {
      const googleEvent = googleEvents.find((event) => event.id === eventId);

      if (googleEvent?.externalId && googleEvent.metadata?.googleCalendarId) {
        const updatedEvent = await updateGoogleEvent(
          googleEvent.externalId,
          input,
          googleEvent.metadata.googleCalendarId
        );
        await refreshGoogleEvents();

        return updatedEvent;
      }

      const updatedEvent = await updateLocalEvent(eventId, input);

      return updatedEvent ? normalizeRoxyEvent(updatedEvent) : undefined;
    },
    [googleEvents, refreshGoogleEvents, updateLocalEvent]
  );

  const addEvent = useCallback(
    async (
      input: CreateRoxyEventInput,
      options: SaveAgendaEventOptions = {}
    ) => {
      if (includeGoogle && !options.forceLocal) {
        const account = await getCurrentGoogleAccount();

        if (account?.accessToken) {
          const createdEvent = await createGoogleEvent(input);
          await refreshGoogleEvents();

          return createdEvent;
        }
      }

      const createdEvent = await addLocalEvent(input);

      return normalizeRoxyEvent(createdEvent);
    },
    [addLocalEvent, includeGoogle, refreshGoogleEvents]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      const googleEvent = googleEvents.find((event) => event.id === eventId);

      if (googleEvent?.externalId && googleEvent.metadata?.googleCalendarId) {
        await deleteGoogleEvent(
          googleEvent.externalId,
          googleEvent.metadata.googleCalendarId
        );
        await refreshGoogleEvents();

        return true;
      }

      return deleteLocalEvent(eventId);
    },
    [deleteLocalEvent, googleEvents, refreshGoogleEvents]
  );

  return useMemo(
    () => ({
      allEvents,
      primaryEvents,
      subtleEvents,
      holidayEvents: subtleEvents,
      isLoading,
      isGoogleLoading: isRefreshingGoogle,
      isRefreshingGoogle,
      googleLastSync,
      googleError,
      refreshGoogleEvents,
      addEvent,
      updateEvent,
      deleteEvent,
    }),
    [
      addEvent,
      allEvents,
      deleteEvent,
      googleError,
      googleLastSync,
      isLoading,
      isRefreshingGoogle,
      primaryEvents,
      refreshGoogleEvents,
      subtleEvents,
      updateEvent,
    ]
  );
}

export type { CreateRoxyEventInput, UpdateRoxyEventInput };
