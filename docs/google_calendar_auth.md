# Google Calendar Auth

Esta etapa deja lista la autenticacion con Google, pero todavia no conecta Google Calendar con Agenda.

## Ya esta preparado

- `expo-auth-session` y `expo-web-browser`.
- Login OAuth con Google desde `googleCalendarService.ts`.
- Guardado temporal de sesion en AsyncStorage.
- Lectura basica del perfil:
  - email
  - nombre
  - foto
  - access token
  - refresh token si Google lo devuelve
- Cierre de sesion local y revocacion del token cuando sea posible.

## Variables necesarias

Configurar al menos un client ID:

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Para leer feriados publicos mas adelante:

```text
EXPO_PUBLIC_GOOGLE_CALENDAR_API_KEY=
```

## Scopes usados

```text
openid
email
profile
https://www.googleapis.com/auth/calendar.readonly
```

## Que falta para empezar a leer Google Calendar

1. Confirmar que el redirect URI generado por Expo esta autorizado en Google Cloud.
2. Conectar `fetchGoogleEvents()` con la cuenta guardada por `getCurrentGoogleAccount()`.
3. Integrar esos eventos en `useAgendaEvents()`.
4. Deduplicar eventos de Google contra eventos locales si hiciera falta.
5. Mostrar estado de conexion en Ajustes o donde corresponda.

Los feriados locales deben seguir como fallback aunque luego se lean feriados publicos desde Google.
