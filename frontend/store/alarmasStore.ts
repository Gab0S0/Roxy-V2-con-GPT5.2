import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { RoxyAlarm, RoxyAlarmStorageSchemaV1 } from '../types/alarm';

export const ROXY_ALARMS_STORAGE_KEY = 'roxy_alarms_v1';

type AlarmInput = Omit<RoxyAlarm, 'id' | 'createdAt' | 'updatedAt' | 'nextTriggerAt'>;
type AlarmUpdate = Partial<Omit<RoxyAlarm, 'id' | 'createdAt'>>;

interface AlarmasState {
  alarmas: RoxyAlarm[];
  isLoading: boolean;
  error: string | null;
  loadAlarmas: () => Promise<void>;
  createAlarma: (alarm: AlarmInput) => Promise<RoxyAlarm | null>;
  updateAlarma: (id: string, updates: AlarmUpdate) => Promise<RoxyAlarm | null>;
  deleteAlarma: (id: string) => Promise<void>;
  toggleAlarma: (id: string) => Promise<void>;
}

const createAlarmId = () =>
  `alarm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeTimePart = (value: number, max: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;

const normalizeRepeatDays = (repeatDays: number[] = []) =>
  Array.from(
    new Set(
      repeatDays
        .map((day) => normalizeTimePart(day, 6))
        .filter((day) => day >= 0 && day <= 6)
    )
  ).sort((a, b) => a - b);

const getNextTriggerAt = (alarm: Pick<RoxyAlarm, 'hour' | 'minute' | 'repeatDays' | 'enabled'>) => {
  if (!alarm.enabled) {
    return undefined;
  }

  const now = new Date();
  const repeatDays = normalizeRepeatDays(alarm.repeatDays);
  const candidates: Date[] = [];

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(alarm.hour, alarm.minute, 0, 0);

    if (repeatDays.length > 0 && !repeatDays.includes(candidate.getDay())) {
      continue;
    }

    if (candidate.getTime() > now.getTime()) {
      candidates.push(candidate);
    }
  }

  return candidates[0]?.toISOString();
};

const normalizeAlarm = (alarm: RoxyAlarm): RoxyAlarm => {
  const normalized: RoxyAlarm = {
    ...alarm,
    hour: normalizeTimePart(alarm.hour, 23),
    minute: normalizeTimePart(alarm.minute, 59),
    repeatDays: normalizeRepeatDays(alarm.repeatDays),
    snoozeMinutes: normalizeTimePart(alarm.snoozeMinutes || 5, 60),
    sound: alarm.sound === 'roxy_theme' ? 'roxy_theme' : 'default',
    vibrate: alarm.vibrate !== false,
  };

  return {
    ...normalized,
    nextTriggerAt: getNextTriggerAt(normalized),
  };
};

const readStoredAlarms = async (): Promise<RoxyAlarm[]> => {
  const raw = await AsyncStorage.getItem(ROXY_ALARMS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw) as Partial<RoxyAlarmStorageSchemaV1>;
  if (parsed.version !== 1 || !Array.isArray(parsed.alarms)) {
    return [];
  }

  return parsed.alarms.map(normalizeAlarm);
};

const writeStoredAlarms = async (alarms: RoxyAlarm[]) => {
  const payload: RoxyAlarmStorageSchemaV1 = {
    version: 1,
    alarms,
  };

  await AsyncStorage.setItem(ROXY_ALARMS_STORAGE_KEY, JSON.stringify(payload));
};

const useAlarmasStore = create<AlarmasState>((set, get) => ({
  alarmas: [],
  isLoading: false,
  error: null,

  loadAlarmas: async () => {
    set({ isLoading: true, error: null });
    try {
      const alarms = await readStoredAlarms();
      await writeStoredAlarms(alarms);
      set({ alarmas: alarms, isLoading: false });
    } catch (error) {
      console.error('Error loading local alarms:', error);
      set({ error: 'No pude cargar las alarmas guardadas.', isLoading: false });
    }
  },

  createAlarma: async (alarmInput) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date().toISOString();
      const alarm = normalizeAlarm({
        ...alarmInput,
        id: createAlarmId(),
        createdAt: now,
        updatedAt: now,
      });
      const alarms = [...get().alarmas, alarm];
      await writeStoredAlarms(alarms);
      set({ alarmas: alarms, isLoading: false });
      return alarm;
    } catch (error) {
      console.error('Error creating local alarm:', error);
      set({ error: 'No pude guardar la alarma.', isLoading: false });
      return null;
    }
  },

  updateAlarma: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      let updatedAlarm: RoxyAlarm | null = null;
      const alarms = get().alarmas.map((alarm) => {
        if (alarm.id !== id) {
          return alarm;
        }

        updatedAlarm = normalizeAlarm({
          ...alarm,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
        return updatedAlarm;
      });

      await writeStoredAlarms(alarms);
      set({ alarmas: alarms, isLoading: false });
      return updatedAlarm;
    } catch (error) {
      console.error('Error updating local alarm:', error);
      set({ error: 'No pude actualizar la alarma.', isLoading: false });
      return null;
    }
  },

  deleteAlarma: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const alarms = get().alarmas.filter((alarm) => alarm.id !== id);
      await writeStoredAlarms(alarms);
      set({ alarmas: alarms, isLoading: false });
    } catch (error) {
      console.error('Error deleting local alarm:', error);
      set({ error: 'No pude borrar la alarma.', isLoading: false });
    }
  },

  toggleAlarma: async (id) => {
    const alarm = get().alarmas.find((item) => item.id === id);
    if (!alarm) {
      return;
    }

    await get().updateAlarma(id, { enabled: !alarm.enabled });
  },
}));

export default useAlarmasStore;
