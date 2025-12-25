# 📚 ROXY - DOCUMENTACIÓN TÉCNICA FINAL

## ✅ MEJORAS IMPLEMENTADAS

### 1. **MULTIUSUARIO COMPLETO**

**Cómo funciona:**
- Cada instalación de la app genera un `userId` único (UUID) la primera vez
- El `userId` se guarda en AsyncStorage y persiste entre sesiones
- TODAS las operaciones backend filtran por `userId`

**Implementación:**

**Frontend:**
```typescript
// /app/frontend/utils/userId.ts
export async function getUserId(): Promise<string> {
  let userId = await AsyncStorage.getItem('@roxy_user_id');
  
  if (!userId) {
    userId = uuid.v4();
    await AsyncStorage.setItem('@roxy_user_id', userId);
  }
  
  return userId;
}
```

**Backend:**
- Todos los modelos incluyen `userId: str`
- Todos los endpoints reciben `userId` como query param
- Todos los queries filtran: `db.alarmas.find({"userId": userId})`

**Colecciones afectadas:**
- ✅ `alarmas`
- ✅ `rutinas`
- ✅ `calendar_events`
- ✅ `chat_history`

---

### 2. **TIMEZONE (ARGENTINA UTC-3) CORRECTO**

**Regla de oro:**
> **La base de datos guarda SIEMPRE datetime en UTC ISO con Z**

**Funciones helper:**

```python
# normalize_to_utc_iso_z(dt_str: str) -> str
# Convierte cualquier datetime a UTC con Z

# Entrada: "2025-12-06T21:00:00" (sin timezone, asume Argentina)
# Salida: "2025-12-07T00:00:00Z" (UTC)

# Entrada: "2025-12-06T21:00:00Z" (ya UTC)
# Salida: "2025-12-06T21:00:00Z" (sin cambios)
```

```python
# next_occurrence_utc_iso_z(repeat_days: List[str], hora_hhmm: str) -> str
# Calcula próxima ocurrencia de rutina en hora local y convierte a UTC

# Entrada: ["monday", "thursday"], "21:00"
# Proceso:
#   1. Obtiene fecha/hora actual en Argentina
#   2. Calcula próximo lunes o jueves
#   3. Establece hora 21:00 en Argentina
#   4. Convierte a UTC
# Salida: "2025-12-09T00:00:00Z"
```

**Conversión UTC ↔ Argentina:**
- Argentina: UTC-3
- 21:00 ARG = 00:00 UTC (del día siguiente)
- 14:00 ARG = 17:00 UTC (mismo día)

**¿Por qué funciona?**
1. Frontend y LLM manejan hora local (usuario piensa en hora Argentina)
2. Backend normaliza TODO a UTC antes de guardar
3. Frontend muestra datetime convertido a local al usuario

---

### 3. **VALIDACIÓN CON PYDANTIC**

**Modelos validados:**

```python
class LlmParams(BaseModel):
    label: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM
    datetime: Optional[str] = None  # Fallback
    repeatPattern: Optional[str] = None
    repeatDays: Optional[List[str]] = []
    # ... más campos

class LlmResult(BaseModel):
    accion: str
    respuesta: str
    parametros: LlmParams
```

**Flujo de validación:**

```python
try:
    resultado_dict = json.loads(response_clean)
    resultado = LlmResult.model_validate(resultado_dict)  # ✅ Validación
    return resultado
except ValidationError as e:
    # ❌ JSON inválido o estructura incorrecta
    return LlmResult(
        accion="info",
        respuesta="No entendí bien. ¿Podrías repetirlo? 💙",
        parametros=LlmParams()
    )
```

**¿Qué valida?**
- Estructura JSON correcta
- Campos requeridos presentes
- Tipos de datos correctos
- Valores enum válidos

**Si falla la validación:**
- NO ejecuta ninguna acción peligrosa
- Devuelve mensaje amigable pidiendo aclaración
- Continúa funcionando sin crashear

---

### 4. **SEGURIDAD UX - NO ELIMINAR SIN CONFIRMAR**

**Validación implementada:**

```python
elif accion == "eliminar":
    if not params.alarmaId:
        # ❌ No hay ID específico
        resultado.respuesta = "¿Cuál alarma quieres eliminar? Dime el nombre."
    else:
        # ✅ Tiene ID, proceder
        await eliminar_alarma(params.alarmaId, request.userId)
```

**Ejemplos:**

❌ Usuario: "Elimina alarma"
→ Roxy: "¿Cuál alarma quieres eliminar? Dime el nombre o muéstrame la lista."

✅ Usuario: "Elimina la alarma de las 8"
→ Roxy identifica ID y elimina

✅ Usuario: "Borra la alarma de entrenar"
→ Roxy identifica por label y elimina

---

### 5. **REPROGRAMACIÓN LIMPIA DE ALARMAS**

**Toggle OFF (desactivar):**
```typescript
// 1. Cancelar notificación programada
const stored = await AsyncStorage.getItem(`alarm_${id}`);
if (stored) {
  const data = JSON.parse(stored);
  if (data.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(data.notificationId);
  }
}

// 2. Actualizar estado en backend
await updateAlarma(id, { isActive: false });
```

**Toggle ON (activar):**
```typescript
// 1. Actualizar en backend (esto dispara re-scheduling)
await updateAlarma(id, { isActive: true });

// 2. En updateAlarma, se re-programa desde cero:
if (updatedAlarma.isActive) {
  // Cancelar notificación vieja si existe
  await cancelNotification(oldNotificationId);
  
  // Programar nueva notificación
  const newNotificationId = await scheduleNotification(updatedAlarma);
  
  // Guardar nuevo ID
  await AsyncStorage.setItem(`alarm_${id}`, JSON.stringify({ 
    notificationId: newNotificationId 
  }));
}
```

**Resultado:**
- Comportamiento predecible tipo "app de alarma"
- No quedan notificaciones huérfanas
- Cada toggle es una operación completa

---

## 📊 TESTING MULTIUSUARIO

**Script de prueba:**
```bash
#!/bin/bash

USER1="test-user-001"
USER2="test-user-002"

# 1. Crear alarma para USER1
curl -X POST "http://localhost:8001/api/alarmas?userId=$USER1" \
  -H "Content-Type: application/json" \
  -d '{"label": "Entrenar", "datetime": "2025-12-06T21:00:00", "repeatPattern": "daily"}'

# 2. Listar alarmas de USER1
curl "http://localhost:8001/api/alarmas?userId=$USER1"

# 3. Crear alarma para USER2
curl -X POST "http://localhost:8001/api/alarmas?userId=$USER2" \
  -H "Content-Type: application/json" \
  -d '{"label": "Estudiar", "datetime": "2025-12-06T19:00:00", "repeatPattern": "daily"}'

# 4. Listar alarmas de USER2
curl "http://localhost:8001/api/alarmas?userId=$USER2"

# 5. Crear rutina via chat para USER1
curl -X POST http://localhost:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Crea rutina de gym martes y jueves 21:00", "userId": "'$USER1'"}'

# 6. Verificar USER1 tiene 2 alarmas
curl "http://localhost:8001/api/alarmas?userId=$USER1"
```

**Resultado esperado:**
- ✅ USER1 tiene 2 alarmas (entrenar + rutina)
- ✅ USER2 tiene 1 alarma (estudiar)
- ✅ Las alarmas están aisladas por userId
- ✅ Timezone convertido correctamente a UTC

---

## 🔧 ARCHIVOS MODIFICADOS

### **Backend:**
- `/app/backend/server.py` (COMPLETO REESCRITO)
  - Helpers de timezone agregados
  - Modelos Pydantic para validación LLM
  - Todos los endpoints con filtro userId
  - Normalización UTC en todos los datetime

### **Frontend:**
- `/app/frontend/utils/userId.ts` (NUEVO)
  - Generación y persistencia de userId

- `/app/frontend/store/alarmasStore.ts` (ACTUALIZADO)
  - Obtiene userId antes de cada request
  - Envía userId en todas las llamadas API
  - Reprogramación limpia (toggle)

- `/app/frontend/store/roxyStore.ts` (ACTUALIZADO)
  - Obtiene userId antes de enviar mensaje
  - Envía userId en /api/chat

### **Dependencias:**
- `react-native-uuid` (agregado)
- `zoneinfo` (ya incluido en Python 3.11+)

---

## 📝 ENDPOINTS API ACTUALIZADOS

**Todos requieren query param `userId` ahora:**

```
GET    /api/alarmas?userId=xxx
POST   /api/alarmas?userId=xxx
GET    /api/alarmas/{id}?userId=xxx
PUT    /api/alarmas/{id}?userId=xxx
DELETE /api/alarmas/{id}?userId=xxx

GET    /api/rutinas?userId=xxx
DELETE /api/rutinas/{id}?userId=xxx

POST   /api/chat (userId en body JSON)
GET    /api/chat/history?userId=xxx
```

---

## ⚠️ BREAKING CHANGES

1. **Todos los endpoints ahora requieren userId**
   - Requests sin userId fallarán
   - Frontend actualizado para enviarlo siempre

2. **Formato datetime cambió a UTC con Z**
   - Antes: podía ser cualquier formato
   - Ahora: SIEMPRE "YYYY-MM-DDTHH:MM:SSZ" en UTC

3. **Base de datos requiere migración**
   - Alarmas viejas sin userId no se mostrarán
   - Solución: agregar userId por defecto a docs existentes

---

## 🎯 PRÓXIMOS PASOS (OPCIONAL)

1. **Migración de datos:**
   ```python
   # Script para agregar userId a alarmas existentes
   await db.alarmas.update_many(
       {"userId": {"$exists": False}},
       {"$set": {"userId": "migration-user-001"}}
   )
   ```

2. **Google Calendar OAuth:**
   - Ya tenemos eventos guardados en MongoDB
   - Solo falta conectar OAuth flow
   - Docs: https://developers.google.com/calendar/api/quickstart/python

3. **Mejor manejo de timezone en LLM:**
   - Entrenar mejor el prompt con ejemplos
   - Agregar contexto de fecha actual

---

## 📚 REFERENCIAS

- **zoneinfo**: https://docs.python.org/3/library/zoneinfo.html
- **Pydantic ValidationError**: https://docs.pydantic.dev/latest/errors/validation_errors/
- **Expo Notifications**: https://docs.expo.dev/versions/latest/sdk/notifications/
- **AsyncStorage**: https://react-native-async-storage.github.io/async-storage/

---

**¡ROXY está lista para producción con multiusuario y timezone correcto!** 🎉
