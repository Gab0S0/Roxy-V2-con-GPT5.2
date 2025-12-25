from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============== TIMEZONE HELPERS ==============

ARGENTINA_TZ = ZoneInfo("America/Argentina/Buenos_Aires")
UTC_TZ = ZoneInfo("UTC")

def normalize_to_utc_iso_z(dt_str: str) -> str:
    """
    Convierte cualquier datetime string a UTC ISO con Z
    - Si viene con Z o +00:00 → ya es UTC
    - Si viene sin timezone → asume Argentina y convierte a UTC
    """
    if not dt_str:
        return datetime.now(UTC_TZ).isoformat().replace('+00:00', 'Z')
    
    try:
        # Intentar parsear con timezone
        if dt_str.endswith('Z'):
            dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        elif '+' in dt_str or dt_str.count('-') > 2:
            dt = datetime.fromisoformat(dt_str)
        else:
            # Sin timezone, asumir Argentina
            dt = datetime.fromisoformat(dt_str)
            dt = dt.replace(tzinfo=ARGENTINA_TZ)
        
        # Convertir a UTC
        dt_utc = dt.astimezone(UTC_TZ)
        return dt_utc.isoformat().replace('+00:00', 'Z')
    
    except Exception as e:
        logger.error(f"Error normalizando datetime: {dt_str} - {str(e)}")
        return datetime.now(UTC_TZ).isoformat().replace('+00:00', 'Z')

def next_occurrence_utc_iso_z(repeat_days: List[str], hora_hhmm: str) -> str:
    """
    Calcula la próxima ocurrencia de una rutina en hora local Argentina
    y la convierte a UTC ISO con Z
    """
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
    }
    
    now_arg = datetime.now(ARGENTINA_TZ)
    current_weekday = now_arg.weekday()
    
    try:
        hora_parts = hora_hhmm.split(":")
        target_hour = int(hora_parts[0])
        target_minute = int(hora_parts[1])
    except:
        target_hour = 21
        target_minute = 0
    
    min_days_ahead = 7
    for dia_str in repeat_days:
        target_day = day_map.get(dia_str, 0)
        days_ahead = (target_day - current_weekday) % 7
        
        if days_ahead == 0:
            today_target = now_arg.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
            if now_arg >= today_target:
                days_ahead = 7
        
        min_days_ahead = min(min_days_ahead, days_ahead)
    
    next_date_arg = now_arg + timedelta(days=min_days_ahead)
    next_date_arg = next_date_arg.replace(
        hour=target_hour,
        minute=target_minute,
        second=0,
        microsecond=0
    )
    
    next_date_utc = next_date_arg.astimezone(UTC_TZ)
    return next_date_utc.isoformat().replace('+00:00', 'Z')

# ============== PYDANTIC MODELS ==============

class LlmParams(BaseModel):
    label: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    datetime: Optional[str] = None
    repeatPattern: Optional[str] = None
    repeatDays: Optional[List[str]] = []
    alarmaId: Optional[str] = None
    hora: Optional[str] = None
    duracionMinutos: Optional[int] = 60
    reminderMinutes: Optional[int] = 30
    tipoEjercicio: Optional[str] = None
    descripcionRutina: Optional[str] = None

class LlmResult(BaseModel):
    accion: str
    respuesta: str
    parametros: LlmParams = Field(default_factory=LlmParams)

class Alarma(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str  # ✅ MULTIUSUARIO
    label: str
    datetime: str  # ✅ Siempre UTC ISO con Z
    repeatPattern: Optional[str] = None
    repeatDays: Optional[List[str]] = []
    isActive: bool = True
    sound: Optional[str] = "default"
    motivationalMessage: Optional[str] = None
    createdBy: str = "user"
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class AlarmaCreate(BaseModel):
    label: str
    datetime: str
    repeatPattern: Optional[str] = None
    repeatDays: Optional[List[str]] = []
    sound: Optional[str] = "default"

class AlarmaUpdate(BaseModel):
    label: Optional[str] = None
    datetime: Optional[str] = None
    repeatPattern: Optional[str] = None
    repeatDays: Optional[List[str]] = None
    isActive: Optional[bool] = None
    sound: Optional[str] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str  # ✅ MULTIUSUARIO
    message: str
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actions: Optional[List[Dict]] = []

class ChatRequest(BaseModel):
    message: str
    userId: str  # ✅ MULTIUSUARIO

class ChatResponse(BaseModel):
    response: str
    actions: List[Dict] = []

class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str  # ✅ MULTIUSUARIO
    summary: str
    description: Optional[str] = None
    start_datetime: str  # ✅ UTC ISO con Z
    end_datetime: str  # ✅ UTC ISO con Z
    reminder_minutes: int = 30
    alarmaId: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    googleEventId: Optional[str] = None

class Rutina(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str  # ✅ MULTIUSUARIO
    nombre: str
    descripcion: Optional[str] = None
    dias: List[str]
    hora: str
    activa: bool = True
    tipoEjercicio: Optional[str] = None
    alarmaId: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

# ============== MONGODB CONNECTION ==============

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== HELPER FUNCTIONS ==============

async def generar_mensaje_motivacional(label: str) -> str:
    """Genera mensaje personalizado con IA según el tipo de alarma"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    system_message = f"""Eres Roxy, una asistente motivadora.
    
Genera un mensaje corto (máximo 12 palabras) para una alarma: "{label}"

Ejemplos:
- Entrenar: "¡Hora de entrenar! Tu cuerpo te lo agradecerá 💪"
- Estudiar: "A aprender! Tu futuro se construye hoy 📚✨"
- Trabajar: "Momento de brillar profesionalmente! Tú puedes 🌟"
- Dormir: "A descansar, mañana será increíble 🌙💙"

Responde SOLO el mensaje, sin comillas."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"motivational_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        response = await chat.send_message(UserMessage(text="Genera el mensaje"))
        return response.strip().strip('"').strip("'")
    except Exception as e:
        logger.error(f"Error generando mensaje: {str(e)}")
        return "¡Es hora! Estoy contigo, vamos juntas 💙✨"

async def interpretar_comando_roxy(mensaje: str, alarmas_existentes: List[Alarma], userId: str) -> LlmResult:
    """Interpreta comandos con Gemini y valida con Pydantic"""
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    contexto_alarmas = "\n".join([
        f"- {a.label}: {a.datetime} (Activa: {a.isActive})" 
        for a in alarmas_existentes
    ])
    
    system_message = f"""Eres Roxy, asistente personal cariñosa en Argentina.

Alarmas del usuario:
{contexto_alarmas if contexto_alarmas else "No hay alarmas."}

Responde SOLO con JSON válido:
{{
  "accion": "crear" | "listar" | "eliminar" | "modificar" | "desactivar" | "activar" | "info" | "crear_evento" | "crear_rutina" | "ver_rutinas",
  "respuesta": "Mensaje motivador en español",
  "parametros": {{
    "label": "Nombre",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "repeatPattern": "daily" | "weekly" | "custom" | null,
    "repeatDays": ["monday", "tuesday"],
    "alarmaId": "id",
    "hora": "HH:MM",
    "duracionMinutos": 60,
    "reminderMinutes": 30,
    "tipoEjercicio": "pierna" | "pecho",
    "descripcionRutina": "..."
  }}
}}

CRÍTICO:
- Usuario en Argentina (UTC-3)
- Devuelve date y time SEPARADOS siempre que puedas
- date: "YYYY-MM-DD", time: "HH:MM"
- NO hagas conversiones, el backend lo maneja
- Para eventos: accion="crear_evento"
- Para rutinas: accion="crear_rutina"
- Si pide eliminar sin especificar: accion="info" y pregunta cuál"""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"roxy_{userId}_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        response = await chat.send_message(UserMessage(text=mensaje))
        response_clean = response.strip()
        
        if response_clean.startswith("```"):
            json_match = re.search(r'```(?:json)?\s*(\{{.*?\}})\s*```', response_clean, re.DOTALL)
            if json_match:
                response_clean = json_match.group(1)
            else:
                response_clean = response_clean.replace("```json", "").replace("```", "").strip()
        
        try:
            resultado_dict = json.loads(response_clean)
        except json.JSONDecodeError:
            json_match = re.search(r'\{{.*\}}', response_clean, re.DOTALL)
            if json_match:
                resultado_dict = json.loads(json_match.group(0))
            else:
                raise ValueError("No se pudo extraer JSON")
        
        # ✅ Validar con Pydantic
        return LlmResult.model_validate(resultado_dict)
        
    except ValidationError as e:
        logger.error(f"Error de validación: {str(e)}")
        return LlmResult(
            accion="info",
            respuesta="No entendí bien. ¿Podrías repetirlo? 💙",
            parametros=LlmParams()
        )
    except Exception as e:
        logger.error(f"Error interpretando: {str(e)}")
        return LlmResult(
            accion="info",
            respuesta="Tuve un problemita. ¿Intentamos de nuevo? 💙",
            parametros=LlmParams()
        )

# ============== ENDPOINTS - ALARMAS ==============

@api_router.post("/alarmas", response_model=Alarma)
async def crear_alarma(alarma: AlarmaCreate, userId: str):
    """Crear alarma - ✅ MULTIUSUARIO + TIMEZONE"""
    datetime_utc = normalize_to_utc_iso_z(alarma.datetime)
    motivational_message = await generar_mensaje_motivacional(alarma.label)
    
    alarma_obj = Alarma(
        userId=userId,
        label=alarma.label,
        datetime=datetime_utc,
        repeatPattern=alarma.repeatPattern,
        repeatDays=alarma.repeatDays or [],
        sound=alarma.sound or "default",
        motivationalMessage=motivational_message,
        isActive=True,
        createdBy="user"
    )
    await db.alarmas.insert_one(alarma_obj.dict())
    return alarma_obj

@api_router.get("/alarmas", response_model=List[Alarma])
async def obtener_alarmas(userId: str):
    """Listar alarmas - ✅ MULTIUSUARIO"""
    alarmas = await db.alarmas.find({"userId": userId}).to_list(1000)
    return [Alarma(**a) for a in alarmas]

@api_router.get("/alarmas/{alarma_id}", response_model=Alarma)
async def obtener_alarma(alarma_id: str, userId: str):
    """Obtener alarma - ✅ MULTIUSUARIO"""
    alarma = await db.alarmas.find_one({"id": alarma_id, "userId": userId})
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return Alarma(**alarma)

@api_router.put("/alarmas/{alarma_id}", response_model=Alarma)
async def actualizar_alarma(alarma_id: str, update: AlarmaUpdate, userId: str):
    """Actualizar alarma - ✅ MULTIUSUARIO + TIMEZONE"""
    alarma = await db.alarmas.find_one({"id": alarma_id, "userId": userId})
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    # ✅ Normalizar datetime si viene
    if "datetime" in update_data:
        update_data["datetime"] = normalize_to_utc_iso_z(update_data["datetime"])
    
    await db.alarmas.update_one(
        {"id": alarma_id, "userId": userId},
        {"$set": update_data}
    )
    
    alarma_actualizada = await db.alarmas.find_one({"id": alarma_id, "userId": userId})
    return Alarma(**alarma_actualizada)

@api_router.delete("/alarmas/{alarma_id}")
async def eliminar_alarma(alarma_id: str, userId: str):
    """Eliminar alarma - ✅ MULTIUSUARIO"""
    result = await db.alarmas.delete_one({"id": alarma_id, "userId": userId})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return {"message": "Alarma eliminada"}

# ============== ENDPOINTS - RUTINAS ==============

@api_router.get("/rutinas")
async def obtener_rutinas(userId: str):
    """Listar rutinas - ✅ MULTIUSUARIO"""
    rutinas = await db.rutinas.find({"userId": userId}).to_list(100)
    for r in rutinas:
        if '_id' in r:
            del r['_id']
    return rutinas

@api_router.delete("/rutinas/{rutina_id}")
async def eliminar_rutina(rutina_id: str, userId: str):
    """Eliminar rutina - ✅ MULTIUSUARIO"""
    rutina = await db.rutinas.find_one({"id": rutina_id, "userId": userId})
    if not rutina:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    if rutina.get("alarmaId"):
        try:
            await eliminar_alarma(rutina["alarmaId"], userId)
        except:
            pass
    
    result = await db.rutinas.delete_one({"id": rutina_id, "userId": userId})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rutina no encontrada")
    
    return {"message": "Rutina eliminada"}

# ============== ENDPOINTS - CHAT ==============

@api_router.post("/chat", response_model=ChatResponse)
async def chat_con_roxy(request: ChatRequest):
    """Chat con Roxy - ✅ MULTIUSUARIO + TIMEZONE + VALIDACIÓN"""
    
    # ✅ MULTIUSUARIO: Solo alarmas de este usuario
    alarmas = await db.alarmas.find({"userId": request.userId}).to_list(1000)
    alarmas_obj = [Alarma(**a) for a in alarmas]
    
    # ✅ Interpretar con validación Pydantic
    resultado = await interpretar_comando_roxy(request.message, alarmas_obj, request.userId)
    
    acciones_realizadas = []
    accion = resultado.accion
    params = resultado.parametros
    
    def build_datetime_utc() -> str:
        """Construye datetime UTC desde date + time"""
        if params.date and params.time:
            dt_str_local = f"{params.date}T{params.time}:00"
            return normalize_to_utc_iso_z(dt_str_local)
        elif params.datetime:
            return normalize_to_utc_iso_z(params.datetime)
        else:
            return normalize_to_utc_iso_z(datetime.now().isoformat())
    
    try:
        if accion == "crear":
            datetime_utc = build_datetime_utc()
            nueva_alarma = AlarmaCreate(
                label=params.label or "Alarma",
                datetime=datetime_utc,
                repeatPattern=params.repeatPattern,
                repeatDays=params.repeatDays or [],
                sound="default"
            )
            alarma_creada = await crear_alarma(nueva_alarma, request.userId)
            acciones_realizadas.append({
                "tipo": "alarma_creada",
                "alarma": alarma_creada.dict()
            })
            
        elif accion == "crear_evento":
            datetime_utc = build_datetime_utc()
            start_dt = datetime.fromisoformat(datetime_utc.replace('Z', '+00:00'))
            end_dt = start_dt + timedelta(minutes=params.duracionMinutos or 60)
            
            evento = CalendarEvent(
                userId=request.userId,
                summary=params.label or "Evento",
                description="Evento creado por Roxy",
                start_datetime=datetime_utc,
                end_datetime=end_dt.isoformat().replace('+00:00', 'Z'),
                reminder_minutes=params.reminderMinutes or 30
            )
            await db.calendar_events.insert_one(evento.dict())
            
            reminder_dt = start_dt - timedelta(minutes=evento.reminder_minutes)
            reminder_label = f"📅 {evento.summary}"
            
            nueva_alarma = AlarmaCreate(
                label=reminder_label,
                datetime=reminder_dt.isoformat().replace('+00:00', 'Z'),
                repeatPattern=None,
                repeatDays=[],
                sound="default"
            )
            alarma_creada = await crear_alarma(nueva_alarma, request.userId)
            
            await db.calendar_events.update_one(
                {"id": evento.id, "userId": request.userId},
                {"$set": {"alarmaId": alarma_creada.id}}
            )
            
            acciones_realizadas.append({
                "tipo": "evento_creado",
                "evento": evento.dict(),
                "alarma": alarma_creada.dict()
            })
            
        elif accion == "crear_rutina":
            dias = params.repeatDays or []
            hora = params.hora or "21:00"
            
            rutina = Rutina(
                userId=request.userId,
                nombre=params.label or "Rutina",
                descripcion=params.descripcionRutina or "",
                dias=dias,
                hora=hora,
                tipoEjercicio=params.tipoEjercicio,
                activa=True
            )
            await db.rutinas.insert_one(rutina.dict())
            
            # ✅ Usar helper de timezone (NO +3 hours manual)
            datetime_utc = next_occurrence_utc_iso_z(dias, hora)
            
            nueva_alarma = AlarmaCreate(
                label=f"🏋️ {rutina.nombre}",
                datetime=datetime_utc,
                repeatPattern="custom",
                repeatDays=dias,
                sound="default"
            )
            alarma_creada = await crear_alarma(nueva_alarma, request.userId)
            
            await db.rutinas.update_one(
                {"id": rutina.id, "userId": request.userId},
                {"$set": {"alarmaId": alarma_creada.id}}
            )
            
            acciones_realizadas.append({
                "tipo": "rutina_creada",
                "rutina": rutina.dict(),
                "alarma": alarma_creada.dict()
            })
            
        elif accion == "ver_rutinas":
            rutinas_raw = await db.rutinas.find({"userId": request.userId}).to_list(100)
            rutinas = []
            for r in rutinas_raw:
                if '_id' in r:
                    del r['_id']
                rutinas.append(r)
            
            if rutinas:
                rutinas_texto = "\n".join([
                    f"- {r.get('nombre', 'Rutina')} ({', '.join(r.get('dias', []))}) a las {r.get('hora', '00:00')}"
                    for r in rutinas
                ])
                resultado.respuesta = f"Aquí están tus rutinas:\n{rutinas_texto}"
            
            acciones_realizadas.append({
                "tipo": "listar_rutinas",
                "rutinas": rutinas
            })
            
        elif accion == "eliminar":
            # ✅ VALIDACIÓN: NO eliminar sin ID
            if not params.alarmaId:
                resultado.respuesta = "¿Cuál alarma quieres eliminar? Dime el nombre o muéstrame la lista."
            else:
                await eliminar_alarma(params.alarmaId, request.userId)
                acciones_realizadas.append({
                    "tipo": "alarma_eliminada",
                    "alarmaId": params.alarmaId
                })
                
        elif accion == "modificar" or accion == "desactivar" or accion == "activar":
            if params.alarmaId:
                update = AlarmaUpdate(
                    label=params.label,
                    datetime=params.datetime,
                    isActive=True if accion == "activar" else False if accion == "desactivar" else None
                )
                alarma_actualizada = await actualizar_alarma(params.alarmaId, update, request.userId)
                acciones_realizadas.append({
                    "tipo": "alarma_actualizada",
                    "alarma": alarma_actualizada.dict()
                })
                
        elif accion == "listar":
            alarmas_actuales = await obtener_alarmas(request.userId)
            acciones_realizadas.append({
                "tipo": "listar_alarmas",
                "alarmas": [a.dict() for a in alarmas_actuales]
            })
            
    except Exception as e:
        logger.error(f"Error ejecutando acción: {str(e)}")
        resultado.respuesta += " Nota: Hubo un problema al ejecutar la acción."
    
    # Guardar en historial
    chat_message = ChatMessage(
        userId=request.userId,
        message=request.message,
        response=resultado.respuesta,
        actions=acciones_realizadas
    )
    await db.chat_history.insert_one(chat_message.dict())
    
    return ChatResponse(
        response=resultado.respuesta,
        actions=acciones_realizadas
    )

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def obtener_historial_chat(userId: str, limit: int = 50):
    """Historial de chat - ✅ MULTIUSUARIO"""
    mensajes = await db.chat_history.find(
        {"userId": userId}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [ChatMessage(**msg) for msg in mensajes]

# ============== BASIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Roxy Backend API - ✅ Multiusuario + Timezone Argentina"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "roxy-api", "timezone": "America/Argentina/Buenos_Aires"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
