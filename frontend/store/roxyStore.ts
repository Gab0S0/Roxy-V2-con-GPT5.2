import { create } from 'zustand';
import axios from 'axios';

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
    // Add user message immediately
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
      const response = await axios.post(`${API_URL}/api/chat`, {
        message,
        userId: 'default_user',
      });

      const roxyMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
      };

      set((state) => ({
        messages: [...state.messages, roxyMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu mensaje. Intenta de nuevo.',
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
