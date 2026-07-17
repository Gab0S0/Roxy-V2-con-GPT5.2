export type RoxyAlarmSound = 'roxy_theme' | 'default';

export interface RoxyAlarm {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  repeatDays: number[];
  snoozeMinutes: number;
  sound: RoxyAlarmSound;
  vibrate: boolean;
  nextTriggerAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoxyAlarmStorageSchemaV1 {
  version: 1;
  alarms: RoxyAlarm[];
}
