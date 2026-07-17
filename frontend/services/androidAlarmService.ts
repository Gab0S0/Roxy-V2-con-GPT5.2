import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

interface RoxyAlarmNativeModule {
  canScheduleExactAlarms(): Promise<boolean>;
  requestExactAlarmPermission(): Promise<void>;
  scheduleTestAlarm(triggerAtMillis: number): Promise<void>;
  cancelTestAlarm(): Promise<void>;
}

const nativeModule =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<RoxyAlarmNativeModule>('RoxyAlarm')
    : null;

const getNativeModule = (): RoxyAlarmNativeModule => {
  if (!nativeModule) {
    throw new Error('El motor nativo de alarmas solo esta disponible en una build Android.');
  }

  return nativeModule;
};

export const canScheduleExactAlarms = () => getNativeModule().canScheduleExactAlarms();

export const requestExactAlarmPermission = () =>
  getNativeModule().requestExactAlarmPermission();

export const scheduleTestAlarm = (triggerAtMillis: number) =>
  getNativeModule().scheduleTestAlarm(triggerAtMillis);

export const cancelTestAlarm = () => getNativeModule().cancelTestAlarm();
