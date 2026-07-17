import { RoxyCategory } from '../data/roxyEvents';

export type GoogleCalendarColorId =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11';

export const roxyCategoryToGoogleColorId: Record<
  RoxyCategory,
  GoogleCalendarColorId
> = {
  trabajo: '9',
  estudio: '3',
  salud: '11',
  fitness: '10',
  personal: '5',
  hogar: '6',
  gaming: '7',
  objetivos: '4',
};

export const googleColorIdToRoxyCategory: Partial<
  Record<GoogleCalendarColorId, RoxyCategory>
> = {
  '3': 'estudio',
  '4': 'objetivos',
  '5': 'personal',
  '6': 'hogar',
  '7': 'gaming',
  '9': 'trabajo',
  '10': 'fitness',
  '11': 'salud',
};

export function getGoogleColorIdForRoxyCategory(category: RoxyCategory) {
  return roxyCategoryToGoogleColorId[category];
}

export function inferRoxyCategoryFromGoogleColorId(colorId?: string) {
  return googleColorIdToRoxyCategory[colorId as GoogleCalendarColorId];
}
