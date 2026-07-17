import { RoxyCategory } from '../data/roxyEvents';

type RadarEvent = {
  title: string;
  date: string;
  category: RoxyCategory | 'feriado' | 'sistema';
};

type SelectedDayRadarOptions = {
  selectedDateKey: string;
  selectedEvents: RadarEvent[];
  selectedHolidayEvents: RadarEvent[];
  upcomingEvents?: RadarEvent[];
};

const categoryNames: Record<RoxyCategory | 'feriado' | 'sistema', string> = {
  trabajo: 'trabajo',
  estudio: 'estudio',
  salud: 'salud',
  fitness: 'entrenamiento',
  personal: 'algo personal',
  hogar: 'casa',
  gaming: 'descanso',
  objetivos: 'un objetivo',
  feriado: 'feriado',
  sistema: 'algo pendiente',
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayVariant(dateKey: string) {
  return dateKey
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
}

function formatCount(count: number) {
  const words: Record<number, string> = {
    2: 'dos',
    3: 'tres',
    4: 'cuatro',
    5: 'cinco',
  };

  return words[count] ?? String(count);
}

function isToday(dateKey: string) {
  return dateKey === formatDateKey(new Date());
}

function getSingleEventMessage(event: RadarEvent, selectedDateKey: string) {
  const todayPrefix = isToday(selectedDateKey) ? 'Hoy' : 'Ese día';

  switch (event.category) {
    case 'trabajo':
      return `${todayPrefix} hay algo de trabajo. Conviene dejarlo claro y avanzar con calma.`;
    case 'estudio':
      return `${todayPrefix} toca estudiar. Empezar por una parte pequeña suele ayudar.`;
    case 'salud':
      return `${todayPrefix} hay algo de salud. Revisa horario y salida con tiempo.`;
    case 'fitness':
      return `${todayPrefix} hay entrenamiento. Si vas con calma, también cuenta.`;
    case 'hogar':
      return `${todayPrefix} hay algo de casa. Mejor resolverlo sin apuro.`;
    case 'gaming':
      return `${todayPrefix} hay un momento de descanso. No todo debe ser obligación.`;
    case 'objetivos':
      return `${todayPrefix} hay un objetivo marcado. Podemos mirarlo de a poco.`;
    default:
      return `${todayPrefix} tienes algo anotado. Miremos eso primero.`;
  }
}

function getMultipleEventsMessage(events: RadarEvent[], selectedDateKey: string) {
  const uniqueCategories = Array.from(
    new Set(events.map((event) => categoryNames[event.category]))
  ).filter(Boolean);

  if (uniqueCategories.length >= 3) {
    return `${uniqueCategories.slice(0, 3).join(', ')}... será un día bastante movido.`;
  }

  const todayPrefix = isToday(selectedDateKey) ? 'Hoy' : 'Ese día';

  return `${todayPrefix} tienes ${formatCount(events.length)} compromisos. Conviene ir uno por uno.`;
}

export function getSelectedDayRadarMessage({
  selectedDateKey,
  selectedEvents,
  selectedHolidayEvents,
  upcomingEvents = [],
}: SelectedDayRadarOptions) {
  if (selectedHolidayEvents.length > 0) {
    return isToday(selectedDateKey)
      ? 'Hoy es feriado. Parece un buen momento para ir un poco más despacio.'
      : 'Ese día es feriado. Tal vez convenga dejarlo un poco más liviano.';
  }

  if (selectedEvents.length > 1) {
    return getMultipleEventsMessage(selectedEvents, selectedDateKey);
  }

  if (selectedEvents.length === 1) {
    return getSingleEventMessage(selectedEvents[0], selectedDateKey);
  }

  const emptyMessages = [
    'Ese día parece tranquilo. No todos los espacios tienen que llenarse.',
    'No veo nada marcado para ese día. Puede ser un buen momento para respirar.',
    'Ese día está despejado. A veces eso también es útil.',
  ];

  if (upcomingEvents.length === 0) {
    return emptyMessages[getDayVariant(selectedDateKey) % emptyMessages.length];
  }

  return emptyMessages[getDayVariant(selectedDateKey) % emptyMessages.length];
}

export function getLongTermReminderMessage(events: RadarEvent[]) {
  const today = new Date();

  const farEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    const diffDays = Math.ceil(
      (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return diffDays >= 30;
  });

  if (farEvents.length === 0) {
    return null;
  }

  const nextFarEvent = farEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];

  return `Tienes algo lejano guardado: ${nextFarEvent.title}. No se va a escapar, lo tengo visto.`;
}
