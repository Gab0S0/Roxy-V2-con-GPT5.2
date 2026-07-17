import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { RoxyEvent } from '../data/roxyEvents';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function parseEventDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function parseEventDateTime(event: RoxyEvent) {
  const date = parseEventDate(event.date);
  const [hours = 9, minutes = 0] = event.time?.split(':').map(Number) ?? [];

  date.setHours(hours, minutes, 0, 0);

  return date;
}

function getNotificationDate(event: RoxyEvent) {
  if (event.reminder === 'none' || !event.reminder) {
    return null;
  }

  if (event.reminder === 'same_day') {
    return parseEventDateTime(event);
  }

  if (event.reminder === 'one_day_before') {
    const notificationDate = parseEventDate(event.date);
    notificationDate.setDate(notificationDate.getDate() - 1);
    notificationDate.setHours(9, 0, 0, 0);

    return notificationDate;
  }

  if (event.reminder === 'one_hour_before') {
    if (!event.time) {
      console.warn(
        'Roxy no puede programar un recordatorio de una hora antes sin hora.'
      );
      return null;
    }

    const notificationDate = parseEventDateTime(event);
    notificationDate.setHours(notificationDate.getHours() - 1);

    return notificationDate;
  }

  return null;
}

function getNotificationBody(event: RoxyEvent) {
  if (event.reminder === 'one_day_before') {
    return 'Mañana tienes algo importante. Conviene no dejarlo demasiado lejos.';
  }

  if (event.reminder === 'one_hour_before') {
    return 'Tienes algo marcado dentro de poco.';
  }

  return 'Es hora de revisar esto.';
}

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') {
    console.warn(
      'Las notificaciones locales de Expo no están soportadas igual en web. El evento se guardará sin notificación.'
    );
    return false;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();

  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();

  return requestedPermissions.granted;
}

export async function scheduleEventNotification(event: RoxyEvent) {
  if (event.source !== 'local') {
    return null;
  }

  const notificationDate = getNotificationDate(event);

  if (!notificationDate) {
    return null;
  }

  if (notificationDate.getTime() <= Date.now()) {
    console.warn('Roxy no programó una notificación para un evento pasado.');
    return null;
  }

  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title,
        body: getNotificationBody(event),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationDate,
      },
    });
  } catch (error) {
    console.warn('Roxy no pudo programar la notificación del evento.', error);
    return null;
  }
}

export async function cancelEventNotification(event: RoxyEvent) {
  if (event.source !== 'local' || !event.notificationId) {
    return;
  }

  if (Platform.OS === 'web') {
    console.warn(
      'Las notificaciones locales de Expo no están soportadas igual en web. No hay notificación móvil que cancelar.'
    );
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(event.notificationId);
  } catch (error) {
    console.warn('Roxy no pudo cancelar la notificación del evento.', error);
  }
}

export async function rescheduleEventNotification(event: RoxyEvent) {
  await cancelEventNotification(event);
  const notificationId = await scheduleEventNotification(event);

  return {
    ...event,
    notificationId: notificationId ?? undefined,
  };
}
