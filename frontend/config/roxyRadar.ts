import { RoxyEvent } from '../data/roxyEvents';

export function getWeeklyRadarMessage(events: RoxyEvent[]) {
  const today = new Date();
  const inSevenDays = new Date();
  inSevenDays.setDate(today.getDate() + 7);

  const upcomingWeek = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= today && eventDate <= inSevenDays;
  });

  const healthEvents = upcomingWeek.filter((e) => e.category === 'salud');
  const studyEvents = upcomingWeek.filter((e) => e.category === 'estudio');
  const fitnessEvents = upcomingWeek.filter((e) => e.category === 'fitness');

  if (upcomingWeek.length === 0) {
    return 'Esta semana parece tranquila. Aprovechá para avanzar con algo que venís postergando 💙';
  }

  if (upcomingWeek.length >= 6) {
    return 'Esta semana viene cargada. Yo no agregaría demasiadas cosas más.';
  }

  if (healthEvents.length > 0) {
    return 'Tenés algo de salud esta semana. Revisá bien horarios y cómo vas a llegar.';
  }

  if (studyEvents.length >= 2) {
    return 'Veo bastante estudio esta semana. Conviene separar bloques cortos y no dejar todo para último momento.';
  }

  if (fitnessEvents.length > 0) {
    return 'Hay entrenamiento marcado. No lo canceles tan fácil 😠';
  }

  return 'Tenés algunas cosas por delante, pero nada imposible. Vamos de a una.';
}

export function getLongTermReminderMessage(events: RoxyEvent[]) {
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

  return `Tenés algo lejano guardado: ${nextFarEvent.title}. No se va a escapar, yo lo tengo visto 💙`;
}