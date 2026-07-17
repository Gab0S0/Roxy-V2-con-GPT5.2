import { RoxyCategory, RoxyEventStatus } from '../data/roxyEvents';

export type AgendaEventSource = 'local' | 'google' | 'holiday' | 'system';

export type AgendaReminder =
  | 'none'
  | 'same_day'
  | 'one_day_before'
  | 'one_hour_before';

export type AgendaEventVisibility = 'primary' | 'subtle' | 'hidden';

export type AgendaEventCategory = RoxyCategory | 'feriado' | 'sistema';

export type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  category: AgendaEventCategory;
  source: AgendaEventSource;
  visibility: AgendaEventVisibility;
  dedupeKey?: string;
  description?: string;
  reminder?: AgendaReminder;
  status?: RoxyEventStatus;
  isAllDay?: boolean;
  isReadOnly?: boolean;
  externalId?: string;
  notificationId?: string;
  metadata?: {
    holidayRegion?: string;
    calendarName?: string;
    googleCalendarId?: string;
    calendarColor?: string;
    primary?: boolean;
    googleEventType?: string;
  };
};
