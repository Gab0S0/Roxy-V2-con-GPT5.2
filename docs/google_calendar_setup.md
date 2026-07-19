# Google Calendar Setup

Esta guía deja preparada la integración futura de Roxy con Google Calendar sin cambiar todavía la UI.

## Estado actual

- `expo-web-browser` ya está instalado.
- `expo-auth-session` ya está instalado.
- Agenda sigue funcionando con eventos locales, mocks y feriados locales.
- Los feriados locales no se borran: quedan como fallback si Google no está conectado o si falla la lectura del calendario público.

## Credenciales necesarias en Google Cloud

En Google Cloud Console hace falta crear o configurar:

- Un proyecto de Google Cloud.
- OAuth consent screen.
- OAuth Client ID para Expo/web.
- API Key si se quiere leer un calendario público de feriados sin iniciar sesión.
- Google Calendar API habilitada.

Para leer el calendario personal del usuario se necesita OAuth. Para leer feriados públicos puede usarse una API key contra un calendario público.

## Redirect URI en Expo

Para desarrollo con Expo AuthSession normalmente se usa un redirect generado por Expo, por ejemplo:

```text
https://auth.expo.io/@TU_USUARIO_EXPO/SLUG_DE_LA_APP
```

También puede usarse el redirect local que devuelve `AuthSession.makeRedirectUri()` al configurar la app.

Cuando se implemente el login real, hay que verificar el valor exacto en el entorno donde corre Roxy:

- Expo Go.
- Development build.
- Web.
- App standalone.

Ese redirect exacto debe estar autorizado en el OAuth Client ID de Google Cloud.

## Scopes necesarios

Para Sprint 2 solo queremos leer eventos, no crear ni modificar Google Calendar.

Scope recomendado:

```text
https://www.googleapis.com/auth/calendar.readonly
```

Este scope permite leer eventos del calendario del usuario conectado.

## Lectura del calendario personal

Flujo esperado:

1. El usuario inicia sesión con Google.
2. Roxy solicita el scope `calendar.readonly`.
3. Google devuelve un `accessToken`.
4. Roxy llama a:

```text
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
```

Parámetros útiles:

- `singleEvents=true`
- `orderBy=startTime`
- `timeMin=<fecha ISO>`
- `timeMax=<fecha ISO>`

Los eventos se normalizan internamente como:

- `source: 'google'`
- `visibility: 'primary'`
- `isReadOnly: true`

En la UI deben verse como eventos personales dentro de una sola Agenda, sin pestañas ni selector de calendarios.

## Lectura de feriados públicos

Para Argentina se deja preparado este calendario público:

```text
es.ar#holiday@group.v.calendar.google.com
```

La lectura sería:

```text
GET https://www.googleapis.com/calendar/v3/calendars/es.ar%23holiday%40group.v.calendar.google.com/events
```

Con API key:

```text
?key=EXPO_PUBLIC_GOOGLE_CALENDAR_API_KEY
```

Los feriados públicos se normalizan como:

- `source: 'holiday'`
- `category: 'feriado'`
- `visibility: 'subtle'`
- `isAllDay: true`
- `isReadOnly: true`

No deben aparecer como cards grandes. Solo marcas sutiles y, si corresponde, una nota discreta del día.

## Variables de entorno propuestas

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_CALENDAR_API_KEY=
```

Los client IDs exactos dependen del tipo de build y plataforma.

## Limitaciones web/mobile

En web:

- El redirect URI debe coincidir exactamente con el configurado en Google Cloud.
- Puede hacer falta configurar orígenes JavaScript autorizados.
- La sesión OAuth depende del navegador.

En mobile:

- Expo Go, development builds y builds standalone pueden requerir redirect URIs distintos.
- Para una app standalone suele convenir usar scheme propio y un OAuth Client ID adecuado para la plataforma.

## Qué falta para producción

- Configurar OAuth real con Google Cloud.
- Guardar y refrescar tokens de forma segura.
- Conectar `fetchGoogleEvents()` con `useAgendaEvents()`.
- Resolver deduplicación entre eventos locales y Google.
- Definir manejo de errores y estado de conexión en Ajustes.
- Mantener los feriados locales como fallback si Google no responde.
