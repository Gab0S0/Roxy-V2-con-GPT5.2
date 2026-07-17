export type RoxyCategory =
  | 'trabajo'
  | 'estudio'
  | 'salud'
  | 'fitness'
  | 'personal'
  | 'hogar'
  | 'gaming'
  | 'objetivos';

export type RoxyEventStatus = 'pending' | 'done' | 'missed';
export type RoxyEventReminder =
  | 'none'
  | 'same_day'
  | 'one_day_before'
  | 'one_hour_before';

export type RoxyEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: RoxyCategory;
  status: RoxyEventStatus;
  source: 'manual' | 'local' | 'google' | 'alarm';
  description?: string;
  reminder?: RoxyEventReminder;
  notificationId?: string;
};

export const roxyEvents: RoxyEvent[] = [];
