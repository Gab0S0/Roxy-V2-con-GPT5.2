import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  getGoogleColorIdForRoxyCategory,
  inferRoxyCategoryFromGoogleColorId,
} from '../config/googleCalendarColors';
import { RoxyCategory } from '../data/roxyEvents';
import { AgendaEvent, AgendaReminder } from '../types/agenda';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';
const GOOGLE_CALENDAR_LIST_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly';
const GOOGLE_ACCOUNT_STORAGE_KEY = '@roxy/google_calendar_account';
const GOOGLE_CONNECTION_ERROR_STORAGE_KEY = '@roxy/google_calendar_error';
const GOOGLE_COLOR_SYNC_STORAGE_KEY = '@roxy/google_calendar_color_sync';
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export type GoogleAccount = {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
};

type GoogleUserInfo = {
  email?: string;
  name?: string;
  picture?: string;
};

type GoogleCalendarDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

type GoogleCalendarApiEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: GoogleCalendarDate;
  end?: GoogleCalendarDate;
  htmlLink?: string;
  colorId?: string;
  eventType?: string;
  status?: string;
  visibility?: string;
  transparency?: string;
  organizer?: Record<string, unknown>;
  creator?: Record<string, unknown>;
  extendedProperties?: {
    private?: Record<string, string | undefined>;
    shared?: Record<string, string | undefined>;
  };
};

type GoogleCalendarApiResponse = {
  items?: GoogleCalendarApiEvent[];
};

export type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
};

type GoogleCalendarAuthResult =
  | {
      status: 'missing_config';
      message: string;
      missing: string[];
    }
  | {
      status: 'cancelled';
    }
  | {
      status: 'dismissed';
    }
  | {
      status: 'error';
      message: string;
    }
  | {
      status: 'connected';
      account: GoogleAccount;
    }
  | {
      status: 'signed_out';
    };

type GoogleAuthErrorResult = {
  error?: {
    message?: string;
  } | null;
  params: Record<string, string>;
};

type FetchGoogleEventsOptions = {
  accessToken?: string;
  timeMin?: string;
  timeMax?: string;
};

export type GoogleCalendarEventInput = {
  title: string;
  date: string;
  time?: string;
  category: RoxyCategory;
  description?: string;
  reminder: AgendaReminder;
};

function getGoogleClientId() {
  if (Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  }

  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
    );
  }

  if (Platform.OS === 'android') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
    );
  }

  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    ''
  );
}

function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    path: 'google-calendar',
  });
}

export function debugRedirectUri() {
  return getRedirectUri();
}

function toIsoDateTime(date: Date) {
  return date.toISOString();
}

function getDefaultTimeMin() {
  const today = new Date();
  today.setDate(today.getDate() - 30);
  today.setHours(0, 0, 0, 0);

  return toIsoDateTime(today);
}

function getDefaultTimeMax() {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  nextYear.setHours(23, 59, 59, 999);

  return toIsoDateTime(nextYear);
}

function buildEventsUrl(
  calendarId: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(
    `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events`
  );

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

function buildEventUrl(calendarId: string, eventId: string) {
  return `${GOOGLE_CALENDAR_API_URL}/calendars/${encodeURIComponent(
    calendarId
  )}/events/${encodeURIComponent(eventId)}`;
}

function buildCalendarListUrl() {
  return `${GOOGLE_CALENDAR_API_URL}/users/me/calendarList`;
}

function parseDateParts(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  return { year, month, day };
}

function addOneDay(dateKey: string) {
  const { year, month, day } = parseDateParts(dateKey);
  const date = new Date(year, month - 1, day + 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function createDateTime(dateKey: string, time: string, minutesOffset = 0) {
  const { year, month, day } = parseDateParts(dateKey);
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes + minutesOffset);

  return date.toISOString();
}

async function isGoogleColorSyncEnabled() {
  const storedValue = await AsyncStorage.getItem(GOOGLE_COLOR_SYNC_STORAGE_KEY);

  return storedValue !== 'false';
}

export async function getGoogleColorSyncEnabled() {
  return isGoogleColorSyncEnabled();
}

export async function setGoogleColorSyncEnabled(enabled: boolean) {
  await AsyncStorage.setItem(
    GOOGLE_COLOR_SYNC_STORAGE_KEY,
    enabled ? 'true' : 'false'
  );
}

async function buildGoogleEventBody(input: GoogleCalendarEventInput) {
  const trimmedTime = input.time?.trim();
  const syncColor = await isGoogleColorSyncEnabled();
  const baseBody = {
    summary: input.title.trim(),
    description: input.description?.trim() || undefined,
    colorId: syncColor
      ? getGoogleColorIdForRoxyCategory(input.category)
      : undefined,
    extendedProperties: {
      private: {
        roxyCategory: input.category,
        roxyReminder: input.reminder,
      },
    },
  };

  if (!trimmedTime) {
    return {
      ...baseBody,
      start: { date: input.date },
      end: { date: addOneDay(input.date) },
    };
  }

  return {
    ...baseBody,
    start: { dateTime: createDateTime(input.date, trimmedTime) },
    end: { dateTime: createDateTime(input.date, trimmedTime, 60) },
  };
}

async function getGoogleAccessToken() {
  const account = await getCurrentGoogleAccount();

  return account?.accessToken;
}

async function handleGoogleWriteError(response: Response) {
  let message = 'No se pudo sincronizar con Google Calendar.';

  try {
    const data = await response.json();
    const googleMessage = data?.error?.message;

    if (typeof googleMessage === 'string') {
      message = googleMessage;
    }
  } catch {
    // Google did not return a readable JSON error.
  }

  if (response.status === 401 || response.status === 403) {
    const reconnectMessage =
      'Google Calendar necesita nuevos permisos. Desconecta y vuelve a conectar desde Ajustes.';
    await saveGoogleConnectionError(reconnectMessage);
    throw new Error(reconnectMessage);
  }

  throw new Error(message);
}

function getEventDateKey(event: GoogleCalendarApiEvent) {
  const dateValue = event.start?.date ?? event.start?.dateTime;

  if (!dateValue) {
    return '';
  }

  return dateValue.slice(0, 10);
}

function normalizeText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getCalendarDisplayName(calendar: GoogleCalendarListEntry) {
  return calendar.summaryOverride || calendar.summary || calendar.id;
}

function hasReadableCalendarAccess(calendar: GoogleCalendarListEntry) {
  return ['owner', 'writer', 'reader'].includes(calendar.accessRole ?? '');
}

function hasWritableCalendarAccess(calendar: GoogleCalendarListEntry) {
  return ['owner', 'writer'].includes(calendar.accessRole ?? '');
}

function isSelectedVisibleCalendar(calendar: GoogleCalendarListEntry) {
  return (
    calendar.selected === true &&
    calendar.hidden !== true &&
    hasReadableCalendarAccess(calendar)
  );
}

function isHolidayCalendar(calendar: GoogleCalendarListEntry) {
  const calendarIdentity = normalizeText(
    `${calendar.id} ${calendar.summary ?? ''} ${calendar.description ?? ''}`
  );

  return (
    calendarIdentity.includes('#holiday') ||
    calendarIdentity.includes('holiday@group.v.calendar.google.com') ||
    calendarIdentity.includes('feriado') ||
    calendarIdentity.includes('festivo')
  );
}

const HOLIDAY_DIAGNOSTIC_TERMS = [
  'independencia',
  'ano nuevo judio',
  'sacrificio',
  'navidad',
];

function shouldLogHolidayEventDiagnostic(event: GoogleCalendarApiEvent) {
  const summary = normalizeText(event.summary);

  return HOLIDAY_DIAGNOSTIC_TERMS.some((term) => summary.includes(term));
}

function logHolidayCalendarDiagnostic(calendar: GoogleCalendarListEntry) {
  console.log('Calendario utilizado:', {
    calendarId: calendar.id,
    summary: getCalendarDisplayName(calendar),
    selected: calendar.selected,
    hidden: calendar.hidden,
    accessRole: calendar.accessRole,
    primary: calendar.primary,
  });
}

function logHolidayEventDiagnostic(
  calendar: GoogleCalendarListEntry,
  event: GoogleCalendarApiEvent
) {
  console.log('-------------------------');
  console.log('SUMMARY:', event.summary);
  console.log('CALENDAR ID:', calendar.id);
  console.log('EVENT ID:', event.id);
  console.log('EVENT TYPE:', event.eventType);
  console.log('STATUS:', event.status);
  console.log('VISIBILITY:', event.visibility);
  console.log('TRANSPARENCY:', event.transparency);
  console.log('ORGANIZER:', event.organizer);
  console.log('CREATOR:', event.creator);
  console.log('COLOR ID:', event.colorId);
  console.log('DESCRIPTION:', event.description);
  console.log('EXTENDED PROPERTIES:', event.extendedProperties);
  console.log('START:', event.start);
  console.log('END:', event.end);
  console.log('RAW EVENT:', event);
  console.log('-------------------------');
}

function getIncludedGoogleCalendars(calendars: GoogleCalendarListEntry[]) {
  const byId = new Map<string, GoogleCalendarListEntry>();

  calendars.forEach((calendar) => {
    if (isSelectedVisibleCalendar(calendar)) {
      byId.set(calendar.id, calendar);
    }
  });

  const primaryCalendar = calendars.find((calendar) => calendar.primary);

  if (primaryCalendar && hasReadableCalendarAccess(primaryCalendar)) {
    byId.set(primaryCalendar.id, primaryCalendar);
  }

  return Array.from(byId.values());
}

function getGoogleEventStableId(
  event: GoogleCalendarApiEvent,
  calendar: GoogleCalendarListEntry
) {
  return encodeURIComponent(`${calendar.id}:${event.id}`);
}

function isAllDayEvent(event: GoogleCalendarApiEvent) {
  return Boolean(event.start?.date && !event.start.dateTime);
}

function getEventTime(event: GoogleCalendarApiEvent) {
  if (!event.start?.dateTime) {
    return undefined;
  }

  const date = new Date(event.start.dateTime);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getRoxyCategory(event: GoogleCalendarApiEvent): RoxyCategory {
  const category = event.extendedProperties?.private?.roxyCategory;
  const allowedCategories: RoxyCategory[] = [
    'trabajo',
    'estudio',
    'salud',
    'fitness',
    'personal',
    'hogar',
    'gaming',
    'objetivos',
  ];

  if (allowedCategories.includes(category as RoxyCategory)) {
    return category as RoxyCategory;
  }

  return inferRoxyCategoryFromGoogleColorId(event.colorId) ?? 'personal';
}

function getRoxyReminder(event: GoogleCalendarApiEvent): AgendaReminder {
  const reminder = event.extendedProperties?.private?.roxyReminder;
  const allowedReminders: AgendaReminder[] = [
    'none',
    'same_day',
    'one_day_before',
    'one_hour_before',
  ];

  return allowedReminders.includes(reminder as AgendaReminder)
    ? (reminder as AgendaReminder)
    : 'none';
}

const DEFAULT_PRIMARY_CALENDAR: GoogleCalendarListEntry = {
  id: 'primary',
  summary: 'Google Calendar',
  primary: true,
  selected: true,
  hidden: false,
  accessRole: 'owner',
};

function normalizeGoogleEvent(
  event: GoogleCalendarApiEvent,
  calendar: GoogleCalendarListEntry = DEFAULT_PRIMARY_CALENDAR
): AgendaEvent {
  const allDay = isAllDayEvent(event);
  const holidayCalendar = isHolidayCalendar(calendar);
  const calendarName = getCalendarDisplayName(calendar);
  const stableId = getGoogleEventStableId(event, calendar);

  return {
    id: `google-${stableId}`,
    externalId: event.id,
    dedupeKey: `${holidayCalendar ? 'holiday' : 'google'}:${calendar.id}:${
      event.id
    }`,
    title: event.summary || (holidayCalendar ? 'Feriado' : 'Evento de Google Calendar'),
    date: getEventDateKey(event),
    time: allDay ? undefined : getEventTime(event),
    category: holidayCalendar ? 'feriado' : getRoxyCategory(event),
    source: holidayCalendar ? 'holiday' : 'google',
    visibility: holidayCalendar ? 'subtle' : 'primary',
    description: event.description,
    reminder: holidayCalendar ? undefined : getRoxyReminder(event),
    isAllDay: allDay,
    isReadOnly: holidayCalendar || !hasWritableCalendarAccess(calendar),
    metadata: {
      googleCalendarId: calendar.id,
      calendarName,
      calendarColor: calendar.backgroundColor,
      primary: Boolean(calendar.primary),
      googleEventType: event.eventType,
      holidayRegion: holidayCalendar ? calendar.id : undefined,
    },
  };
}

async function saveGoogleAccount(account: GoogleAccount) {
  await AsyncStorage.setItem(
    GOOGLE_ACCOUNT_STORAGE_KEY,
    JSON.stringify(account)
  );
  await AsyncStorage.removeItem(GOOGLE_CONNECTION_ERROR_STORAGE_KEY);
}

async function saveGoogleConnectionError(message: string) {
  await AsyncStorage.setItem(GOOGLE_CONNECTION_ERROR_STORAGE_KEY, message);
}

async function createGoogleAccountFromAccessToken(
  accessToken: string,
  refreshToken?: string
) {
  const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('No se pudo obtener el perfil de Google.');
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  return {
    email: userInfo.email ?? '',
    name: userInfo.name ?? userInfo.email ?? 'Cuenta de Google',
    picture: userInfo.picture,
    accessToken,
    refreshToken,
  };
}

function getAuthErrorMessage(result: GoogleAuthErrorResult) {
  return (
    result.error?.message ||
    result.params.error_description ||
    result.params.error ||
    'Google devolvio un error durante el inicio de sesion.'
  );
}

function getUnexpectedAuthStateMessage(result: AuthSession.AuthSessionResult) {
  return `AuthSession termino con estado inesperado: ${result.type}`;
}

export async function signInWithGoogleCalendar(): Promise<GoogleCalendarAuthResult> {
  const redirectUri = getRedirectUri();
  console.log('Google Redirect URI:', redirectUri);
  const clientId = getGoogleClientId();

  if (!clientId) {
    return {
      status: 'missing_config',
      message:
        'Falta configurar un Google OAuth Client ID para iniciar sesion.',
      missing: [
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
        'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
      ],
    };
  }

  if (Platform.OS === 'web') {
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      scopes: [
        'openid',
        'email',
        'profile',
        GOOGLE_CALENDAR_EVENTS_SCOPE,
        GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
      ],
      usePKCE: false,
      extraParams: {
        include_granted_scopes: 'true',
        prompt: 'consent',
      },
    });

    const result = await request.promptAsync(GOOGLE_DISCOVERY);

    if (result.type === 'cancel') {
      return {
        status: 'cancelled',
      };
    }

    if (result.type === 'dismiss') {
      return {
        status: 'dismissed',
      };
    }

    if (result.type === 'error') {
      return {
        status: 'error',
        message: getAuthErrorMessage(result),
      };
    }

    if (result.type !== 'success') {
      return {
        status: 'error',
        message: getUnexpectedAuthStateMessage(result),
      };
    }

    const accessToken =
      result.authentication?.accessToken || result.params.access_token;

    if (!accessToken) {
      return {
        status: 'error',
        message: 'Google no devolvio un access token para la sesion web.',
      };
    }

    const account = await createGoogleAccountFromAccessToken(accessToken);

    await saveGoogleAccount(account);

    return {
      status: 'connected',
      account,
    };
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: [
      'openid',
      'email',
      'profile',
      GOOGLE_CALENDAR_EVENTS_SCOPE,
      GOOGLE_CALENDAR_LIST_READONLY_SCOPE,
    ],
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type === 'cancel') {
    return {
      status: 'cancelled',
    };
  }

  if (result.type === 'dismiss') {
    return {
      status: 'dismissed',
    };
  }

  if (result.type === 'error') {
    return {
      status: 'error',
      message:
        result.error?.message ||
        result.params.error_description ||
        result.params.error ||
        'Google devolvio un error durante el inicio de sesion.',
    };
  }

  if (result.type !== 'success' || !result.params.code) {
    return {
      status: 'error',
      message: `AuthSession termino con estado inesperado: ${result.type}`,
    };
  }

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? '',
      },
    },
    GOOGLE_DISCOVERY
  );

  const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenResponse.accessToken}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('No se pudo obtener el perfil de Google.');
  }

  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
  const account: GoogleAccount = {
    email: userInfo.email ?? '',
    name: userInfo.name ?? userInfo.email ?? 'Cuenta de Google',
    picture: userInfo.picture,
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
  };

  await saveGoogleAccount(account);

  return {
    status: 'connected',
    account,
  };
}

export async function signOutGoogleCalendar(): Promise<GoogleCalendarAuthResult> {
  const account = await getCurrentGoogleAccount();

  if (account?.accessToken) {
    try {
      await AuthSession.revokeAsync(
        {
          clientId: getGoogleClientId(),
          token: account.accessToken,
        },
        GOOGLE_DISCOVERY
      );
    } catch (error) {
      console.warn('No se pudo revocar el token de Google.', error);
    }
  }

  await AsyncStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY);
  await AsyncStorage.removeItem(GOOGLE_CONNECTION_ERROR_STORAGE_KEY);

  return {
    status: 'signed_out',
  };
}

export async function getCurrentGoogleAccount() {
  const storedAccount = await AsyncStorage.getItem(GOOGLE_ACCOUNT_STORAGE_KEY);

  if (!storedAccount) {
    return null;
  }

  try {
    return JSON.parse(storedAccount) as GoogleAccount;
  } catch (error) {
    console.warn('No se pudo leer la sesion de Google guardada.', error);
    await AsyncStorage.removeItem(GOOGLE_ACCOUNT_STORAGE_KEY);
    return null;
  }
}

export async function getGoogleCalendarConnectionError() {
  return AsyncStorage.getItem(GOOGLE_CONNECTION_ERROR_STORAGE_KEY);
}

export async function isGoogleConnected() {
  const account = await getCurrentGoogleAccount();

  return Boolean(account?.accessToken);
}

export async function fetchGoogleEvents({
  accessToken,
  timeMin = getDefaultTimeMin(),
  timeMax = getDefaultTimeMax(),
}: FetchGoogleEventsOptions = {}) {
  const account = accessToken ? null : await getCurrentGoogleAccount();
  const token = accessToken ?? account?.accessToken;

  if (!token) {
    console.warn(
      'No se pueden leer eventos de Google Calendar sin accessToken.'
    );
    return [];
  }

  const calendars = await fetchGoogleCalendarList(token);
  const includedCalendars = getIncludedGoogleCalendars(calendars);

  console.log(
    'Google calendars found:',
    calendars.map((calendar) => ({
      id: calendar.id,
      summary: calendar.summary,
      selected: calendar.selected,
      hidden: calendar.hidden,
      accessRole: calendar.accessRole,
      primary: calendar.primary,
    }))
  );

  console.log(
    'Google calendars included:',
    includedCalendars.map((calendar) => ({
      id: calendar.id,
      summary: getCalendarDisplayName(calendar),
      selected: calendar.selected,
      hidden: calendar.hidden,
      accessRole: calendar.accessRole,
      primary: calendar.primary,
      classification: isHolidayCalendar(calendar) ? 'holiday' : 'google',
    }))
  );

  const allEvents: AgendaEvent[] = [];

  for (const calendar of includedCalendars) {
    const holidayCalendar = isHolidayCalendar(calendar);

    if (holidayCalendar) {
      logHolidayCalendarDiagnostic(calendar);
    }

    const response = await fetch(
      buildEventsUrl(calendar.id, {
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin,
        timeMax,
      }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      const reconnectMessage =
        response.status === 403
          ? 'Google Calendar necesita nuevos permisos. Desconecta y vuelve a conectar desde Ajustes.'
          : 'Google Calendar necesita reconexion. Vuelve a iniciar sesion.';

      await saveGoogleConnectionError(reconnectMessage);
      throw new Error(reconnectMessage);
    }

    if (!response.ok) {
      console.warn('No se pudo leer un calendario de Google Calendar.', {
        calendarId: calendar.id,
        calendarName: getCalendarDisplayName(calendar),
        status: response.status,
      });
      continue;
    }

    const data = (await response.json()) as GoogleCalendarApiResponse;
    const googleEvents = data.items ?? [];

    if (holidayCalendar) {
      googleEvents.forEach((event) => {
        if (shouldLogHolidayEventDiagnostic(event)) {
          logHolidayEventDiagnostic(calendar, event);
        }
      });
    }

    const events = googleEvents
      .map((event) => normalizeGoogleEvent(event, calendar))
      .filter((event) => Boolean(event.date));

    console.log('Google calendar events count:', {
      calendarId: calendar.id,
      calendarName: getCalendarDisplayName(calendar),
      classification: holidayCalendar ? 'holiday' : 'google',
      count: events.length,
    });

    allEvents.push(...events);
  }

  return allEvents;
}

export async function createGoogleEvent(
  input: GoogleCalendarEventInput,
  calendarId = 'primary'
) {
  const token = await getGoogleAccessToken();

  if (!token) {
    throw new Error('Conecta Google Calendar para guardar este evento.');
  }

  const eventBody = await buildGoogleEventBody(input);
  const response = await fetch(buildEventsUrl(calendarId, {}), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    await handleGoogleWriteError(response);
  }

  const data = (await response.json()) as GoogleCalendarApiEvent;

  return normalizeGoogleEvent(data, DEFAULT_PRIMARY_CALENDAR);
}

export async function updateGoogleEvent(
  eventId: string,
  input: GoogleCalendarEventInput,
  calendarId = 'primary'
) {
  const token = await getGoogleAccessToken();

  if (!token) {
    throw new Error('Conecta Google Calendar para editar este evento.');
  }

  const eventBody = await buildGoogleEventBody(input);
  const response = await fetch(buildEventUrl(calendarId, eventId), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    await handleGoogleWriteError(response);
  }

  const data = (await response.json()) as GoogleCalendarApiEvent;

  return normalizeGoogleEvent(data, {
    ...DEFAULT_PRIMARY_CALENDAR,
    id: calendarId,
  });
}

export async function deleteGoogleEvent(eventId: string, calendarId = 'primary') {
  const token = await getGoogleAccessToken();

  if (!token) {
    throw new Error('Conecta Google Calendar para eliminar este evento.');
  }

  const response = await fetch(buildEventUrl(calendarId, eventId), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleGoogleWriteError(response);
  }

  return true;
}

export async function fetchGoogleCalendarList(accessToken?: string) {
  const account = accessToken ? null : await getCurrentGoogleAccount();
  const token = accessToken ?? account?.accessToken;

  if (!token) {
    return [];
  }

  const response = await fetch(buildCalendarListUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    const reconnectMessage =
      'Google Calendar necesita reconexion. Vuelve a iniciar sesion.';

    await saveGoogleConnectionError(reconnectMessage);
    throw new Error(reconnectMessage);
  }

  if (!response.ok) {
    throw new Error('No se pudo leer la lista de calendarios de Google.');
  }

  const data = (await response.json()) as GoogleCalendarListResponse;

  return data.items ?? [];
}
