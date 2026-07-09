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

export type RoxyEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: RoxyCategory;
  status: RoxyEventStatus;
  source: 'manual' | 'google' | 'alarm';
  description?: string;
};

export const roxyEvents: RoxyEvent[] = [
  {
    id: '1',
    title: 'Gym',
    date: '2026-08-20',
    time: '19:00',
    category: 'fitness',
    status: 'pending',
    source: 'manual',
    description: 'Entrenar aunque sea liviano. No desaparecer.',
  },
  {
    id: '2',
    title: 'Programación UTN',
    date: '2026-08-21',
    time: '18:30',
    category: 'estudio',
    status: 'pending',
    source: 'manual',
    description: 'Repasar ejercicios y avanzar una hora.',
  },
  {
    id: '3',
    title: 'Odontólogo',
    date: '2026-11-12',
    time: '15:30',
    category: 'salud',
    status: 'pending',
    source: 'google',
    description: 'Turno lejano. Roxy debe recordarlo con anticipación.',
  },
];
