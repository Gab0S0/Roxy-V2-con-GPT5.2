import { Ionicons } from '@expo/vector-icons';
import { RoxyCategory } from '../data/roxyEvents';

export const categoryConfig: Record<
  RoxyCategory,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
  }
> = {
  trabajo: {
    label: 'Trabajo',
    icon: 'briefcase-outline',
    color: '#60A5FA',
    bg: 'rgba(96, 165, 250, 0.16)',
  },
  estudio: {
    label: 'Estudio',
    icon: 'book-outline',
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.16)',
  },
  salud: {
    label: 'Salud',
    icon: 'heart-outline',
    color: '#FB7185',
    bg: 'rgba(251, 113, 133, 0.16)',
  },
  fitness: {
    label: 'Fitness',
    icon: 'barbell-outline',
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.16)',
  },
  personal: {
    label: 'Personal',
    icon: 'person-outline',
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.16)',
  },
  hogar: {
    label: 'Hogar',
    icon: 'home-outline',
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.16)',
  },
  gaming: {
    label: 'Gaming',
    icon: 'game-controller-outline',
    color: '#22D3EE',
    bg: 'rgba(34, 211, 238, 0.16)',
  },
  objetivos: {
    label: 'Objetivos',
    icon: 'flag-outline',
    color: '#E879F9',
    bg: 'rgba(232, 121, 249, 0.16)',
  },
};