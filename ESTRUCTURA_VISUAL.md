# 🎨 Estructura Visual del Proyecto Roxy

## 📱 Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO                                 │
│                    (Dispositivo Móvil)                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND (React Native/Expo)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  📍 Alarmas │  │  💬 Roxy    │  │  ⚙️ Ajustes │        │
│  │   Screen    │  │   Screen    │  │   Screen    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│              ┌────────────────────────┐                     │
│              │  Zustand State Stores  │                     │
│              ├────────────────────────┤                     │
│              │  • alarmasStore.ts     │                     │
│              │  • roxyStore.ts        │                     │
│              └────────┬───────────────┘                     │
│                       │                                     │
│                       ▼                                     │
│              ┌────────────────────────┐                     │
│              │   Axios HTTP Client    │                     │
│              └────────┬───────────────┘                     │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │ (REST API)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (FastAPI/Python)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Endpoints                            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  /api/alarmas     → CRUD de alarmas                  │  │
│  │  /api/chat        → Chat con Roxy                    │  │
│  │  /api/health      → Health check                     │  │
│  └────────┬─────────────────────────┬───────────────────┘  │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌────────────────┐      ┌────────────────────┐           │
│  │   MongoDB      │      │  OpenAI GPT-4o-mini│           │
│  │   (Database)   │      │  (vía Emergent)    │           │
│  ├────────────────┤      ├────────────────────┤           │
│  │ • alarmas      │      │ Interpreta comandos│           │
│  │ • chat_history │      │ en lenguaje natural│           │
│  └────────────────┘      └────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Carpetas Detallada

```
📦 roxy-assistant/
│
├── 📂 backend/                    # Servidor FastAPI
│   ├── 📄 server.py              # ⭐ Aplicación principal
│   ├── 📄 requirements.txt       # Dependencias Python
│   └── 🔐 .env                   # Variables de entorno
│
├── 📂 frontend/                   # App React Native
│   │
│   ├── 📂 app/                   # 🎯 Rutas (Expo Router)
│   │   ├── 📂 (tabs)/           # Grupo de navegación por tabs
│   │   │   ├── 📄 _layout.tsx   # Config de tabs
│   │   │   ├── 📄 index.tsx     # 📍 Pantalla: Alarmas
│   │   │   ├── 📄 roxy.tsx      # 💬 Pantalla: Chat Roxy
│   │   │   └── 📄 settings.tsx  # ⚙️ Pantalla: Ajustes
│   │   └── 📄 _layout.tsx       # Layout raíz
│   │
│   ├── 📂 store/                 # 🗃️ Estado Global (Zustand)
│   │   ├── 📄 alarmasStore.ts   # Store de alarmas
│   │   └── 📄 roxyStore.ts      # Store de chat
│   │
│   ├── 📂 assets/                # 🎨 Recursos estáticos
│   │   ├── 📂 fonts/            # Fuentes
│   │   └── 📂 images/           # Imágenes
│   │
│   ├── 📄 package.json          # Dependencias Node.js
│   ├── 📄 app.json              # Config de Expo
│   ├── 🔐 .env                  # Variables de entorno
│   └── 📄 tsconfig.json         # Config TypeScript
│
└── 📂 tests/                     # 🧪 Tests automatizados
    ├── 📄 backend_test.py       # Tests principales
    └── 📄 backend_edge_test.py  # Tests de casos edge
```

---

## 🔄 Flujo de Datos: Crear Alarma con Roxy

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO escribe: "Crea alarma para mañana a las 8"       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (roxy.tsx)                                       │
│    • Componente de chat captura el mensaje                  │
│    • useRoxyStore.sendMessage() se ejecuta                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ POST /api/chat
                      │ { message: "Crea alarma...", userId: "..." }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND (server.py)                                       │
│    • Endpoint /api/chat recibe el mensaje                   │
│    • Llama a interpretar_comando_roxy()                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ LlmChat.send_message()
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OPENAI GPT-4o-mini                                        │
│    • Recibe: "Crea alarma para mañana a las 8"             │
│    • Contexto: Alarmas existentes del usuario               │
│    • Responde JSON:                                         │
│      {                                                       │
│        "accion": "crear",                                   │
│        "respuesta": "Listo. Alarma creada...",             │
│        "parametros": {                                      │
│          "label": "Alarma",                                 │
│          "datetime": "2025-07-21T08:00:00Z"                │
│        }                                                    │
│      }                                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND ejecuta acción                                   │
│    • Crea nueva alarma en MongoDB                          │
│    • Guarda conversación en chat_history                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Respuesta JSON
                      │ { response: "Listo...", actions: [...] }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND recibe respuesta                                │
│    • roxyStore actualiza mensajes                           │
│    • Muestra respuesta de Roxy en el chat                   │
│    • alarmasStore.loadAlarmas() refresca lista             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. NOTIFICACIONES LOCALES                                    │
│    • expo-notifications programa la alarma                  │
│    • Guarda ID de notificación en AsyncStorage             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. USUARIO ve la nueva alarma en ambas pantallas:           │
│    • 💬 Chat: "Listo. Alarma creada..."                    │
│    • 📍 Alarmas: Nueva alarma en la lista                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Componentes Clave

### **Frontend:**

```
┌──────────────────────────────────────────────┐
│         alarmasStore.ts                       │
├──────────────────────────────────────────────┤
│ Estado:                                       │
│  • alarmas: Alarma[]                         │
│  • isLoading: boolean                        │
│                                              │
│ Acciones:                                    │
│  • loadAlarmas()         → GET /api/alarmas │
│  • createAlarma()        → POST /api/alarmas│
│  • updateAlarma()        → PUT /api/alarmas │
│  • deleteAlarma()        → DELETE /api/... │
│  • toggleAlarma()        → Activa/Desactiva │
│                                              │
│ Notificaciones:                              │
│  • scheduleNotification() → expo-notifications│
│  • cancelNotification()                      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│         roxyStore.ts                          │
├──────────────────────────────────────────────┤
│ Estado:                                       │
│  • messages: Message[]                       │
│  • isLoading: boolean                        │
│                                              │
│ Acciones:                                    │
│  • sendMessage()         → POST /api/chat   │
│  • clearMessages()                           │
└──────────────────────────────────────────────┘
```

### **Backend:**

```
┌──────────────────────────────────────────────┐
│            server.py                          │
├──────────────────────────────────────────────┤
│                                              │
│ Modelos (Pydantic):                          │
│  • Alarma                                    │
│  • AlarmaCreate                              │
│  • AlarmaUpdate                              │
│  • ChatMessage                               │
│  • ChatRequest                               │
│  • ChatResponse                              │
│                                              │
│ Funciones Clave:                             │
│  • interpretar_comando_roxy()                │
│    └─→ Usa OpenAI para NLP                  │
│                                              │
│ Endpoints:                                   │
│  • POST   /api/alarmas                      │
│  • GET    /api/alarmas                      │
│  • GET    /api/alarmas/{id}                 │
│  • PUT    /api/alarmas/{id}                 │
│  • DELETE /api/alarmas/{id}                 │
│  • POST   /api/chat                         │
│  • GET    /api/chat/history                 │
│  • GET    /api/health                       │
│                                              │
│ Integraciones:                               │
│  • MongoDB (motor.motor_asyncio)            │
│  • OpenAI (emergentintegrations)            │
└──────────────────────────────────────────────┘
```

---

## 🎨 UI/UX - Pantallas

```
┌─────────────────────────────────────────────────┐
│  📍 Alarmas Screen (index.tsx)                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  21:00                           [✓]    │   │
│  │  Gimnasio                               │   │
│  │  20 jul 2025 • Semanal                  │   │
│  │                           [✏️]  [🗑️]    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  19:00                           [✓]    │   │
│  │  Estudiar IA                            │   │
│  │  20 jul 2025 • Diario                   │   │
│  │                           [✏️]  [🗑️]    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│                                      [+] FAB    │
│                                                  │
│  [📍 Alarmas]  [💬 Roxy]  [⚙️ Ajustes]         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  💬 Roxy Screen (roxy.tsx)                      │
├─────────────────────────────────────────────────┤
│                                                  │
│            ✨                                   │
│       ¡Hola! Soy Roxy                           │
│   Tu asistente personal para alarmas            │
│                                                  │
│   Puedes decirme cosas como:                    │
│   • "Crea una alarma para mañana a las 8"       │
│   • "¿Qué alarmas tengo hoy?"                   │
│   • "Recuérdame entrenar cada martes..."        │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  Habla con Roxy...              [➤]    │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [📍 Alarmas]  [💬 Roxy]  [⚙️ Ajustes]         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  ⚙️ Settings Screen (settings.tsx)              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Notificaciones                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔔 Notificaciones          [ON/OFF]    │   │
│  │    Recibir alertas de alarmas          │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔊 Sonido                  [ON/OFF]    │   │
│  │    Reproducir sonido de alarma         │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  Acerca de                                       │
│  ┌─────────────────────────────────────────┐   │
│  │           ✨                             │   │
│  │          Roxy                            │   │
│  │       Versión 1.0.0                      │   │
│  │  Tu asistente personal de alarmas        │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [📍 Alarmas]  [💬 Roxy]  [⚙️ Ajustes]         │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Variables de Entorno

```
┌─────────────────────────────────────────────────┐
│  Backend (.env)                                  │
├─────────────────────────────────────────────────┤
│  MONGO_URL           → mongodb://localhost:27017│
│  DB_NAME             → test_database            │
│  EMERGENT_LLM_KEY    → sk-emergent-xxx...       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Frontend (.env)                                 │
├─────────────────────────────────────────────────┤
│  EXPO_PUBLIC_BACKEND_URL                        │
│    → https://roxy-assistant-1.preview...        │
│                                                  │
│  (Otras vars internas de Expo)                  │
│  EXPO_PACKAGER_HOSTNAME                         │
│  EXPO_TUNNEL_SUBDOMAIN                          │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Comandos de Ejecución

```bash
# 🔧 BACKEND
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 📱 FRONTEND
cd /app/frontend
yarn start          # Expo con QR
yarn start --web    # Navegador web
yarn ios            # Simulator iOS
yarn android        # Emulator Android
```

---

**¡Ahora tienes el mapa completo de Roxy! 🗺️✨**
