import { AgendaEvent } from '../types/agenda';

export const holidayEvents: AgendaEvent[] = [
  {
    id: 'holiday-ar-2026-01-01',
    title: 'Año Nuevo',
    date: '2026-01-01',
    category: 'feriado',
    source: 'holiday',
    visibility: 'subtle',
    isAllDay: true,
    isReadOnly: true,
    metadata: {
      holidayRegion: 'AR',
    },
  },
  {
    id: 'holiday-ar-2026-05-25',
    title: 'Día de la Revolución de Mayo',
    date: '2026-05-25',
    category: 'feriado',
    source: 'holiday',
    visibility: 'subtle',
    isAllDay: true,
    isReadOnly: true,
    metadata: {
      holidayRegion: 'AR',
    },
  },
  {
    id: 'holiday-ar-2026-07-09',
    title: 'Día de la Independencia',
    date: '2026-07-09',
    category: 'feriado',
    source: 'holiday',
    visibility: 'subtle',
    isAllDay: true,
    isReadOnly: true,
    metadata: {
      holidayRegion: 'AR',
    },
  },
  {
    id: 'holiday-ar-2026-12-25',
    title: 'Navidad',
    date: '2026-12-25',
    category: 'feriado',
    source: 'holiday',
    visibility: 'subtle',
    isAllDay: true,
    isReadOnly: true,
    metadata: {
      holidayRegion: 'AR',
    },
  },
];
