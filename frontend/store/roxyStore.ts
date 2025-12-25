import { create } from 'zustand';
import axios from 'axios';
import { getUserId } from '../utils/userId';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface RoxyState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

const useRoxyStore = create<RoxyState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (message: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const userId = await getUserId();
      const url = `${API_URL}/api/chat`;
      
      console.log('🔵 [ROXY] Enviando mensaje:', { url, userId, message });
      
      const response = await axios.post(url, {
        message,
        userId,
      });

      console.log('✅ [ROXY] Respuesta recibida:', response.data);

      const roxyMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
      };

      set((state) => ({
        messages: [...state.messages, roxyMessage],
        isLoading: false,
      }));
      
      // ✅ REFRESCAR ALARMAS si Roxy hizo cambios
      if (response.data.actions && response.data.actions.length > 0) {
        const needsRefresh = response.data.actions.some((action: any) =>
          ['alarma_creada', 'alarma_actualizada', 'alarma_eliminada', 
           'rutina_creada', 'evento_creado'].includes(action.tipo)
        );
        
        if (needsRefresh) {
          console.log('🔄 [ROXY] Refrescando alarmas después de acción');
          // Importar dinámicamente para evitar dependencia circular
          const { default: useAlarmasStore } = await import('./alarmasStore');
          useAlarmasStore.getState().loadAlarmas();
        }
      }
      
    } catch (error) {
      console.error('❌ [ROXY] Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, tuve un problema. Intenta de nuevo.',
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
        error: 'Error al enviar mensaje',
      }));
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));

export default useRoxyStore;
