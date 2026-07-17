import AsyncStorage from '@react-native-async-storage/async-storage';

export const roxyPhrases = {
  homeMorning: [
    'Buenos días. Podemos empezar con calma.',
    'Me alegra verte esta mañana.',
    'No hay prisa. Mira primero lo más simple.',
    'El día apenas comienza. Una cosa a la vez.',
    'Estoy aquí. Podemos ver qué sigue.',
    'Empieza por algo pequeño y claro.',
    'Aún hay silencio suficiente para pensar.',
    'Respira un momento. Después seguimos.',
    'Hoy no hace falta hacerlo perfecto.',
    'Que la mañana sea amable contigo.',
  ],
  homeAfternoon: [
    'Buenas tardes. Podemos empezar por una sola cosa.',
    'Aún queda día. No lo llenes de golpe.',
    'Miremos qué sigue, sin apurarnos.',
    'Si algo quedó pendiente, lo veremos con calma.',
    'Me alegra encontrarte aquí.',
    'Una tarde también puede ordenarse despacio.',
    'No necesitas resolverlo todo ahora.',
    'Elige una cosa. Yo te acompaño.',
    'Si el día pesa un poco, avancemos más lento.',
    'Vamos paso a paso.',
  ],
  homeNight: [
    'Buenas noches. Descansa un momento.',
    'Si fue un día largo, baja el ritmo.',
    'No todo debe cerrarse esta noche.',
    'Podemos dejar una sola cosa ordenada.',
    'Estoy aquí. No hay prisa.',
    'La noche también sirve para recuperar fuerzas.',
    'Si algo salió mal, mañana lo intentamos de nuevo.',
    'Hazlo pequeño, si aún queda algo por hacer.',
    'No fuerces más de lo necesario.',
    'Quédate un momento. Después decides.',
  ],
  homeReturnAfterDays: [
    'Me alegra verte otra vez.',
    'No voy a reprocharte la ausencia. Sigamos desde aquí.',
    'Volver también cuenta.',
    'Han pasado algunos días. Empecemos despacio.',
    'No hace falta explicar todo ahora.',
    'Miremos lo que quedó esperando.',
    'Si te perdiste un poco, podemos retomar con calma.',
    'Estoy aquí. Empezamos de nuevo.',
    'Una pausa no borra lo que ya intentaste.',
    'Primero una cosa. Después veremos lo demás.',
  ],
  alarmEarly: [
    'Es temprano, lo sé. Pero conviene levantarse ahora.',
    'Todavía cuesta abrir los ojos. Empieza despacio.',
    'Si esto estaba marcado, era por una razón.',
    'Levántate con calma. No necesitas correr.',
    'Un primer paso basta para salir de la cama.',
    'Vamos. El día puede esperar unos segundos más, pero no mucho.',
    'No pienses en todo. Solo levántate.',
    'Abrígate si hace frío. Después seguimos.',
    'Esto será más fácil si empiezas ahora.',
    'Estoy contigo. Arriba, poco a poco.',
  ],
  study: [
    'Estudia un bloque corto. Entender bien una parte ya cuenta.',
    'No intentes aprender todo de una vez.',
    'Una buena lección necesita paciencia.',
    'Primero lo básico. Después lo difícil.',
    'Si te pierdes, vuelve al primer paso.',
    'Aprender magia también empieza con ejercicios simples.',
    'Repite con calma. No es una derrota.',
    'Anota lo que no entiendas. Eso también es estudiar.',
    'Hoy basta con avanzar un poco.',
    'No busques perfección. Busca entender.',
  ],
  work: [
    'Mira primero lo que vence antes.',
    'No hace falta cargar con todo al mismo tiempo.',
    'Una tarea clara es mejor que diez abiertas.',
    'Resuelve lo urgente sin perder la calma.',
    'Si algo puede esperar, déjalo esperar.',
    'Empieza por lo que tenga menos ruido.',
    'Cuida tu atención. También se gasta.',
    'Trabaja con orden, no con prisa.',
    'Cierra una cosa antes de abrir otra.',
    'Lo importante merece un poco de silencio.',
  ],
  health: [
    'Esto es de salud. Mejor verlo con tiempo.',
    'Lleva lo que necesites y sal sin apuro.',
    'No minimices lo que tu cuerpo intenta decir.',
    'Cuidarte también es una tarea importante.',
    'Si tienes dudas, pregúntalas con calma.',
    'Anota lo importante antes de ir.',
    'No lo dejes demasiado lejos.',
    'La salud no necesita valentía, necesita atención.',
    'Ve con tiempo. Eso evita errores pequeños.',
    'Hazlo por cuidado, no por miedo.',
  ],
  gym: [
    'No hace falta entrenar perfecto. Ir ya cuenta.',
    'Muévete un poco. Eso puede ser suficiente.',
    'Empieza suave y escucha al cuerpo.',
    'No lo conviertas en castigo.',
    'Un entrenamiento simple también sirve.',
    'Si estás cansado, baja la intensidad.',
    'La constancia suele ser más amable que la fuerza.',
    'Haz lo posible hoy. Mañana veremos.',
    'No compitas con una versión imaginaria de ti.',
    'Moverse un poco también despeja la mente.',
  ],
  calmDay: [
    'Ese día parece tranquilo.',
    'Puede servir para descansar un poco.',
    'No todo debe estar lleno.',
    'Un día suave también tiene valor.',
    'Quizá puedas adelantar algo pequeño.',
    'Si no hay urgencias, no inventes una.',
    'Aprovecha el silencio con cuidado, no con prisa.',
    'Hoy puede quedar simple.',
    'Respirar un poco no es perder el tiempo.',
    'Dejemos espacio para pensar.',
  ],
  busyWeek: [
    'Esta semana tiene varias cosas.',
    'No agregaría demasiado más si puedes evitarlo.',
    'Conviene mirar primero lo más cercano.',
    'Una semana cargada se ordena por partes.',
    'No intentes sostenerlo todo en la cabeza.',
    'Elige bien dónde poner tu energía.',
    'Si algo no es necesario, déjalo para después.',
    'Vamos a cuidar el ritmo.',
    'Una cosa por vez. Incluso esta semana.',
    'Será más fácil si no lo haces todo hoy.',
  ],
  taskCompleted: [
    'Bien hecho. Lo terminaste.',
    'No tenía que salir perfecto.',
    'Eso ya quedó atrás. Buen trabajo.',
    'Avanzaste. Aunque haya sido poco, cuenta.',
    'Me alegra que lo hayas completado.',
    'Una cosa menos esperando.',
    'Puedes descansar un momento.',
    'Buen paso. Sigamos cuando estés listo.',
    'Eso requirió atención. Se nota.',
    'Terminaste algo. No lo pases por alto.',
  ],
  taskMissed: [
    'No salió hoy. Está bien.',
    'Mañana lo intentamos de nuevo, pero más pequeño.',
    'Fallar una tarea no borra el camino.',
    'No te castigues por esto.',
    'Miremos qué lo hizo difícil.',
    'Puede esperar un poco, si lo retomamos con cuidado.',
    'Hoy no alcanzó. A veces pasa.',
    'Vuelve al primer paso cuando puedas.',
    'No lo conviertas en una culpa.',
    'Sigamos desde aquí.',
  ],
};

export const homeDialoguePhrases = {
  calmDay: [
    'Hoy no veo nada urgente. Un día así puede servir para pensar con un poco más de claridad.',
    'El día parece despejado. No hace falta llenarlo para que valga.',
    'No hay mucho marcado por ahora. A veces el silencio también ayuda a ordenar.',
    'Hoy se ve liviano. Podrías dejarlo simple y cuidar un poco el ritmo.',
    'No encuentro compromisos cerca. Eso no es un error; también es espacio.',
    'Parece un día tranquilo. Si aparece algo importante, lo miraremos sin apuro.',
    'Hoy no hay señales de tormenta. Aprovecha para respirar antes de decidir.',
    'El calendario está quieto. Me parece bien no molestarlo demasiado.',
  ],
  singleEvent: [
    'Hay una cosa marcada para hoy. Mejor mirarla de frente y no cargar con más de lo necesario.',
    'Hoy tienes un compromiso. Con saber dónde empieza, ya es más fácil avanzar.',
    'Veo una sola marca en el día. Eso permite prestarle atención sin dispersarse.',
    'Hay algo esperando hoy. No parece enorme, pero conviene no dejarlo escondido.',
    'Una tarea clara suele ser más amable que muchas dudas juntas.',
    'Hoy el día señala una cosa. Miremos esa primero.',
    'No hay demasiadas piezas sobre la mesa. Eso puede jugar a tu favor.',
    'Tienes algo anotado para hoy. Con prepararlo un poco, alcanza.',
  ],
  multipleEvents: [
    'Hoy tienes {count} compromisos. Conviene ir por partes, sin intentar sostenerlos todos a la vez.',
    '{categories}... hoy no parece que vayas a aburrirte.',
    'Veo varias cosas juntas para hoy. Será mejor elegir bien el primer paso.',
    'Hoy el calendario está bastante despierto. No hace falta responderle todo de golpe.',
    'Hay {count} marcas en el día. Ordenarlas antes de empezar puede ahorrarte cansancio.',
    '{categories} aparecen en el mismo día. Será un pequeño ejercicio de paciencia.',
    'Hoy hay movimiento. Si separas una cosa de la otra, se vuelve menos pesado.',
    'No es un día vacío. Procura no tratarlo como si tuvieras cuatro manos.',
    'Veo {count} asuntos para hoy. Primero el más cercano, después el siguiente.',
    'El día viene con varias puertas abiertas. No tienes que cruzarlas todas al mismo tiempo.',
  ],
  study: [
    'Hoy aparece estudio. Una lección entendida a medias todavía puede volverse clara.',
    'Toca estudiar. Empieza por lo que puedas explicar con tus propias palabras.',
    'Veo estudio en el día. No intentes dominar todo en una sola lectura.',
    'Estudiar también es volver sobre lo difícil sin pelearse con ello.',
    'Hoy conviene preparar la mente como antes de una lección: poco ruido y buen pulso.',
    'Hay estudio marcado. Si algo no sale, vuelve al primer paso.',
  ],
  work: [
    'Hoy aparece trabajo. Lo más útil será distinguir lo importante de lo ruidoso.',
    'Veo trabajo en el día. Mejor cerrar una cosa con cuidado que abrir demasiadas.',
    'Hay algo laboral marcado. Revisa lo cercano y deja lo demás en su sitio.',
    'Trabajo, entonces. Procura no regalarle más atención de la necesaria.',
    'Hoy el trabajo pide lugar. Dáselo, pero no le entregues todo el día.',
    'Veo una tarea de trabajo. Si está clara, ya pesa menos.',
  ],
  fitness: [
    'Hoy hay entrenamiento. No tiene que ser perfecto para contar.',
    'Veo movimiento marcado. Escucha al cuerpo antes de exigirle respuestas.',
    'Toca entrenar. Ir con una intención simple suele alcanzar.',
    'Hay ejercicio en el día. No lo conviertas en castigo.',
    'Entrenar también puede ser una forma tranquila de volver al cuerpo.',
    'Veo entrenamiento. Hazlo posible, no heroico.',
  ],
  health: [
    'Hoy hay algo de salud. Revisa la hora y sal con margen.',
    'Veo una cita de salud. Es mejor tratar estas cosas con atención, no con miedo.',
    'Esto parece importante para tu cuidado. No lo dejes perdido entre otras tareas.',
    'Hay salud en el calendario. Lleva lo necesario y evita correr al final.',
    'Hoy conviene escuchar al cuerpo con un poco más de respeto.',
    'Veo algo médico o de cuidado. Prepararlo antes puede evitar errores pequeños.',
  ],
  tomorrowEarly: [
    'Mañana tienes algo temprano. Sería prudente dejar la mañana un poco preparada.',
    'Veo un compromiso temprano mañana. Esta noche no debería robarte demasiado sueño.',
    'Mañana empieza pronto. Deja lo necesario a mano y no confíes solo en la memoria.',
    'Hay algo temprano esperando mañana. Mejor no llegar a él desde el desorden.',
    'Mañana tendrás que levantarte con dirección. Un pequeño preparativo bastará.',
    'El primer tramo de mañana ya está ocupado. Conviene tratarlo con cuidado desde hoy.',
  ],
  tomorrowEvents: [
    'Mañana tienes algo anotado. No hace falta resolverlo ahora, solo no perderlo de vista.',
    'Veo movimiento para mañana. Tal vez hoy convenga dejar una parte simple.',
    'Mañana no está vacío. Preparar un detalle hoy puede ayudarte después.',
    'Hay algo esperando mañana. Lo miraremos mejor cuando esté más cerca.',
    'Mañana trae un compromiso. Por ahora basta con recordarlo.',
    'El calendario ya dejó una señal para mañana. No parece urgente, pero sí conviene verla.',
  ],
  night: [
    'Ya es de noche. Si algo queda pendiente, que sea pequeño y claro.',
    'La noche no es buen lugar para pelear con todo el día.',
    'Si el día fue largo, no le exijas una última victoria.',
    'A esta hora conviene bajar la voz, incluso por dentro.',
    'Todavía puedes dejar algo ordenado, pero sin convertirlo en castigo.',
    'La noche sirve para recuperar fuerzas. Eso también es parte del camino.',
  ],
  holiday: [
    'Hoy es feriado. Parece un buen momento para ir un poco más despacio.',
    'El día tiene otro ritmo. No hace falta tratarlo como uno común.',
    'Hoy el calendario baja la voz. Tal vez sea sensato escucharlo.',
    'Es feriado. Si puedes descansar un poco, no lo consideres tiempo perdido.',
  ],
  returnAfterDays: [
    'Me alegra verte otra vez. No voy a reprocharte la ausencia.',
    'Pasaron algunos días. Podemos retomar desde aquí, sin hacer ruido.',
    'Volver también cuenta. Primero miremos lo que está más cerca.',
    'Has estado fuera un tiempo. No hace falta explicarlo todo para seguir.',
  ],
  weekend: [
    'Es fin de semana. Sería extraño tratarlo exactamente como un día común.',
    'Hoy el ritmo puede ser distinto. No todo necesita una razón importante.',
    'El fin de semana deja un poco más de aire. Úsalo con cuidado.',
    'Parece un día para bajar medio paso. A veces eso basta.',
  ],
  birthdayToday: [
    'Hoy aparece tu cumpleaños. Espero que el día sea amable contigo.',
    'El calendario dice que hoy es tu cumpleaños. Me alegra poder verte aquí.',
    'Hoy es una fecha tuya. No hace falta hacerla perfecta para que importe.',
    'Tu cumpleaños está marcado hoy. Ojalá encuentres un momento que se sienta propio.',
  ],
};

export type HomeDialoguePhraseGroup = keyof typeof homeDialoguePhrases;

const HOME_LAST_PHRASE_STORAGE_KEY = '@roxy/home_dialogue_last_phrase_by_group';

type PhraseVariables = Record<string, string | number | undefined>;

function hashText(value: string) {
  return value.split('').reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 0);
}

function applyPhraseVariables(phrase: string, variables: PhraseVariables = {}) {
  return Object.entries(variables).reduce((nextPhrase, [key, value]) => {
    return nextPhrase.replaceAll(`{${key}}`, String(value ?? ''));
  }, phrase);
}

async function getStoredHomeLastPhrases() {
  try {
    const storedValue = await AsyncStorage.getItem(HOME_LAST_PHRASE_STORAGE_KEY);

    return storedValue ? (JSON.parse(storedValue) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function getStableHomeRoxyPhrase(
  group: HomeDialoguePhraseGroup,
  contextKey: string,
  variables?: PhraseVariables
) {
  const phrases = homeDialoguePhrases[group];
  const storedPhrases = await getStoredHomeLastPhrases();
  let index = hashText(`${group}:${contextKey}`) % phrases.length;
  let phrase = applyPhraseVariables(phrases[index], variables);

  if (phrases.length > 1 && storedPhrases[group] === phrase) {
    index = (index + 1) % phrases.length;
    phrase = applyPhraseVariables(phrases[index], variables);
  }

  await AsyncStorage.setItem(
    HOME_LAST_PHRASE_STORAGE_KEY,
    JSON.stringify({
      ...storedPhrases,
      [group]: phrase,
    })
  );

  return phrase;
}

export function getRandomRoxyPhrase(
  group: keyof typeof roxyPhrases
): string {
  const phrases = roxyPhrases[group];
  const index = Math.floor(Math.random() * phrases.length);

  return phrases[index];
}
