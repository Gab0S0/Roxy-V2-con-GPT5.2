# 📱 Roxy - Guía de Uso y Estructura del Proyecto

## 📂 Estructura del Proyecto

```
roxy/
├── backend/                          # Backend FastAPI
│   ├── .env                          # Variables de entorno del backend
│   ├── server.py                     # Servidor principal con todos los endpoints
│   └── requirements.txt              # Dependencias de Python
│
├── frontend/                         # Frontend React Native (Expo)
│   ├── app/                          # Rutas de la aplicación (Expo Router)
│   │   ├── (tabs)/                   # Grupo de tabs
│   │   │   ├── _layout.tsx          # Layout de tabs (navegación)
│   │   │   ├── index.tsx            # 📍 Pantalla de Alarmas
│   │   │   ├── roxy.tsx             # 💬 Pantalla de Chat con Roxy
│   │   │   └── settings.tsx         # ⚙️ Pantalla de Configuración
│   │   └── _layout.tsx              # Layout raíz
│   │
│   ├── store/                        # Estado global (Zustand)
│   │   ├── alarmasStore.ts          # Store de alarmas + notificaciones
│   │   └── roxyStore.ts             # Store del chat con Roxy
│   │
│   ├── assets/                       # Imágenes, fuentes, etc.
│   ├── .env                          # Variables de entorno del frontend
│   ├── app.json                      # Configuración de Expo
│   ├── package.json                  # Dependencias de Node.js
│   └── tsconfig.json                 # Configuración de TypeScript
│
└── tests/                            # Tests automatizados
    ├── backend_test.py               # Tests del backend
    └── backend_edge_test.py          # Tests de casos edge

```

---

## 🚀 Cómo Ejecutar el Proyecto

### **1. Backend (FastAPI + MongoDB)**

#### **Requisitos:**
- Python 3.11+
- MongoDB corriendo en localhost:27017
- pip instalado

#### **Pasos:**

1. **Instalar dependencias:**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Configurar variables de entorno:**

El archivo `.env` ya está configurado:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
EMERGENT_LLM_KEY=sk-emergent-7Fa8b4fC552A698B3E
```

3. **Ejecutar el servidor:**
```bash
# Desarrollo (con hot-reload)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Producción
uvicorn server:app --host 0.0.0.0 --port 8001
```

4. **Verificar que funciona:**
```bash
curl http://localhost:8001/api/health
# Respuesta: {"status":"healthy","service":"roxy-api"}
```

#### **Endpoints Disponibles:**

**Health:**
- `GET /api/` - Mensaje de bienvenida
- `GET /api/health` - Health check

**Alarmas:**
- `POST /api/alarmas` - Crear alarma
- `GET /api/alarmas` - Listar todas las alarmas
- `GET /api/alarmas/{id}` - Obtener alarma específica
- `PUT /api/alarmas/{id}` - Actualizar alarma
- `DELETE /api/alarmas/{id}` - Eliminar alarma

**Chat con Roxy:**
- `POST /api/chat` - Enviar mensaje a Roxy
- `GET /api/chat/history` - Obtener historial de chat

**Rutinas:**
- `GET /api/rutinas` - Listar rutinas del usuario
- `DELETE /api/rutinas/{id}` - Eliminar rutina

---

### **2. Frontend (React Native con Expo)**

#### **Requisitos:**
- Node.js 18+ y npm/yarn
- Expo CLI instalado globalmente

#### **Pasos:**

1. **Instalar dependencias:**
```bash
cd /app/frontend
yarn install
# o
npm install
```

2. **Configurar variables de entorno:**

El archivo `.env` ya está configurado:
```env
EXPO_TUNNEL_SUBDOMAIN=roxy-assistant-1
EXPO_PACKAGER_HOSTNAME=https://roxy-assistant-1.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://roxy-assistant-1.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER="1"
METRO_CACHE_ROOT=/app/frontend/.metro-cache
```

**⚠️ IMPORTANTE:** Si ejecutas localmente, cambia:
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

3. **Ejecutar la aplicación:**

**Opción A: Desarrollo Web**
```bash
yarn start --web
# o
npx expo start --web
```

**Opción B: Desarrollo en Dispositivo Móvil (Expo Go)**
```bash
yarn start
# o
npx expo start
```

Esto generará un QR que puedes escanear con:
- **iOS:** Cámara nativa → abre Expo Go
- **Android:** Expo Go app → Scan QR

**Opción C: Emuladores**
```bash
# iOS Simulator (requiere Mac)
yarn ios

# Android Emulator
yarn android
```

---

## 📦 Dependencias Clave

### **Backend (Python):**
- `fastapi` - Framework web
- `uvicorn` - Servidor ASGI
- `motor` - Driver async de MongoDB
- `pymongo` - Driver de MongoDB
- `emergentintegrations` - Integración con OpenAI
- `python-dotenv` - Manejo de variables de entorno

### **Frontend (React Native):**
- `expo` - Framework de React Native
- `expo-router` - Navegación basada en archivos
- `expo-notifications` - Sistema de notificaciones locales
- `expo-av` - Reproducción de audio
- `expo-speech` - Text-to-speech
- `@react-native-async-storage/async-storage` - Almacenamiento local
- `zustand` - State management
- `axios` - Cliente HTTP
- `date-fns` - Manejo de fechas
- `@expo/vector-icons` - Iconos

---

## 🎯 Flujo de Datos

```
Usuario → Frontend (React Native)
    ↓
    ↓ HTTP Requests (axios)
    ↓
Backend (FastAPI) → OpenAI GPT-4o-mini
    ↓                    ↓
    ↓                    ↓ Interpreta comandos
    ↓                    ↓
MongoDB ← Guardar/Leer ←┘
    ↓
    ↓ Respuesta JSON
    ↓
Frontend → Actualiza UI + Programa Notificaciones
```

---

## 🧪 Testing

### **Backend:**
```bash
cd /app
python backend_test.py        # Tests principales
python backend_edge_test.py   # Tests de casos edge
```

### **Frontend:**
```bash
cd /app/frontend
yarn lint                     # Linting de código
yarn test                     # Tests (si están configurados)
```

---

## 📱 Probar en Dispositivo Real

### **Método 1: Expo Go (Recomendado para desarrollo)**

1. Descarga Expo Go:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Inicia el servidor:
```bash
cd /app/frontend
yarn start
```

3. Escanea el QR con Expo Go

### **Método 2: Build Nativo (Para producción)**

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

---

## 🔧 Comandos Útiles

### **Backend:**
```bash
# Ver logs en tiempo real
tail -f /var/log/supervisor/backend.err.log

# Reiniciar backend
sudo supervisorctl restart backend

# Ver status
sudo supervisorctl status backend
```

### **Frontend:**
```bash
# Limpiar caché de Metro
yarn start --clear

# Reiniciar Expo
sudo supervisorctl restart expo

# Ver logs
tail -f /var/log/supervisor/expo.out.log
```

---

## 💡 Variables de Entorno Importantes

### **Backend (.env):**
```env
MONGO_URL              # URL de conexión a MongoDB
DB_NAME                # Nombre de la base de datos
EMERGENT_LLM_KEY       # API Key para OpenAI (vía Emergent)
```

### **Frontend (.env):**
```env
EXPO_PUBLIC_BACKEND_URL    # URL del backend (accessible desde el código)
```

**⚠️ Nota:** Variables que empiezan con `EXPO_PUBLIC_` son accesibles en el código del frontend.

---

## 🐛 Troubleshooting

### **Backend no se conecta a MongoDB:**
```bash
# Verificar que MongoDB esté corriendo
sudo systemctl status mongodb
# o
ps aux | grep mongod
```

### **Frontend no carga las alarmas:**
- Verifica que `EXPO_PUBLIC_BACKEND_URL` apunte al backend correcto
- Revisa los logs del navegador (F12)
- Verifica que el backend esté corriendo

### **Notificaciones no funcionan:**
- En web: Las notificaciones tienen soporte limitado
- En dispositivo: Verifica permisos de notificaciones
- Prueba en dispositivo físico (emuladores tienen limitaciones)

---

## 📚 Arquitectura Técnica

### **Backend:**
- **Framework:** FastAPI (Python)
- **Base de datos:** MongoDB
- **IA:** OpenAI GPT-4o-mini vía emergentintegrations
- **Patrón:** REST API con async/await

### **Frontend:**
- **Framework:** React Native (Expo)
- **Navegación:** Expo Router (file-based)
- **State Management:** Zustand
- **Notificaciones:** expo-notifications
- **Estilo:** StyleSheet nativo (no CSS)

---

## 🎨 Pantallas Disponibles

1. **`/` (Alarmas)** - Lista y gestión de alarmas
2. **`/roxy` (Chat)** - Conversación con Roxy
3. **`/settings` (Ajustes)** - Configuración de notificaciones

---

## 🔐 Seguridad

- ✅ CORS configurado en backend
- ✅ Validación de datos con Pydantic
- ✅ API Key protegida en .env
- ✅ HTTPS habilitado en preview

---

## 📈 Próximas Mejoras

- [ ] Integración con Google Calendar
- [ ] Comandos de voz
- [ ] TTS para alarmas
- [ ] Sincronización en la nube
- [ ] Sonidos personalizados

---

**¿Preguntas?** Consulta la documentación de:
- [Expo](https://docs.expo.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React Native](https://reactnative.dev/)
