import { create } from 'zustand';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getUserId } from '../utils/userId';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Alarma {
  id: string;
  label: string;
  datetime: string;
  repeatPattern?: string | null;
  repeatDays?: string[];
  isActive: boolean;
  sound?: string;
  motivationalMessage?: string;
  notificationId?: string;
}

interface AlarmasState {
  alarmas: Alarma[];
  isLoading: boolean;
  error: string | null;
  loadAlarmas: () => Promise<void>;
  createAlarma: (alarma: Omit<Alarma, 'id' | 'isActive'>) => Promise<void>;
  updateAlarma: (id: string, updates: Partial<Alarma>) => Promise<void>;
  deleteAlarma: (id: string) => Promise<void>;
  toggleAlarma: (id: string) => Promise<void>;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const scheduleNotification = async (alarma: Alarma): Promise<string | null> => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }

    const alarmDate = new Date(alarma.datetime);
    const now = new Date();
    const triggerTime = alarmDate.getTime() - now.getTime();

    if (triggerTime <= 0) {
      console.log('Alarm time is in the past');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ ' + alarma.label,
        body: alarma.motivationalMessage || '¡Es hora! Estoy contigo, vamos juntas 💙✨',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        seconds: Math.floor(triggerTime / 1000),
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

const cancelNotification = async (notificationId: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('✅ Notification cancelled:', notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

const useAlarmasStore = create<AlarmasState>((set, get) => ({
  alarmas: [],
  isLoading: false,
  error: null,

  loadAlarmas: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getUserId();
      const response = await axios.get(`${API_URL}/api/alarmas`, {
        params: { userId }
      });
      const alarmasFromServer = response.data;

      // Load local notification IDs
      const alarmasConNotificaciones = await Promise.all(
        alarmasFromServer.map(async (alarma: Alarma) => {
          const stored = await AsyncStorage.getItem(`alarm_${alarma.id}`);
          if (stored) {
            const data = JSON.parse(stored);
            return { ...alarma, notificationId: data.notificationId };
          }
          return alarma;
        })
      );

      set({ alarmas: alarmasConNotificaciones, isLoading: false });
    } catch (error) {
      console.error('Error loading alarms:', error);
      set({ error: 'Error al cargar alarmas', isLoading: false });
    }
  },

  createAlarma: async (alarmaData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getUserId();
      const response = await axios.post(`${API_URL}/api/alarmas`, alarmaData, {
        params: { userId }
      });
      const newAlarma = response.data;

      // Schedule notification
      const notificationId = await scheduleNotification(newAlarma);
      if (notificationId) {
        await AsyncStorage.setItem(
          `alarm_${newAlarma.id}`,
          JSON.stringify({ notificationId })
        );
        newAlarma.notificationId = notificationId;
      }

      set((state) => ({
        alarmas: [...state.alarmas, newAlarma],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error creating alarm:', error);
      set({ error: 'Error al crear alarma', isLoading: false });
    }
  },

  updateAlarma: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const userId = await getUserId();
      const response = await axios.put(`${API_URL}/api/alarmas/${id}`, updates, {
        params: { userId }
      });
      const updatedAlarma = response.data;

      // Reschedule notification if active
      if (updatedAlarma.isActive) {
        const stored = await AsyncStorage.getItem(`alarm_${id}`);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.notificationId) {
            await cancelNotification(data.notificationId);
          }
        }
        const notificationId = await scheduleNotification(updatedAlarma);
        if (notificationId) {
          await AsyncStorage.setItem(
            `alarm_${id}`,
            JSON.stringify({ notificationId })
          );
          updatedAlarma.notificationId = notificationId;
        }
      }

      set((state) => ({
        alarmas: state.alarmas.map((a) =>
          a.id === id ? updatedAlarma : a
        ),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error updating alarm:', error);
      set({ error: 'Error al actualizar alarma', isLoading: false });
    }
  },

  deleteAlarma: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Cancel notification
      const stored = await AsyncStorage.getItem(`alarm_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.notificationId) {
          await cancelNotification(data.notificationId);
        }
        await AsyncStorage.removeItem(`alarm_${id}`);
      }

      const userId = await getUserId();
      await axios.delete(`${API_URL}/api/alarmas/${id}`, {
        params: { userId }
      });
      set((state) => ({
        alarmas: state.alarmas.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error deleting alarm:', error);
      set({ error: 'Error al eliminar alarma', isLoading: false });
    }
  },

  toggleAlarma: async (id) => {
    const alarma = get().alarmas.find((a) => a.id === id);
    if (!alarma) return;

    const newActiveState = !alarma.isActive;

    // ✅ REPROGRAMACIÓN LIMPIA
    if (newActiveState) {
      // Activar: reprogramar desde cero
      await get().updateAlarma(id, { isActive: true });
    } else {
      // Desactivar: cancelar notificación
      const stored = await AsyncStorage.getItem(`alarm_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.notificationId) {
          await cancelNotification(data.notificationId);
        }
      }
      await get().updateAlarma(id, { isActive: false });
    }
  },
}));

export default useAlarmasStore;
