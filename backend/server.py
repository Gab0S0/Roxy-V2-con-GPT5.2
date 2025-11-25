from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class Alarma(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    datetime: str  # ISO format
    repeatPattern: Optional[str] = None  # "daily", "weekly", "custom"
    repeatDays: Optional[List[str]] = []  # ["monday", "tuesday", etc]
    isActive: bool = True
    sound: Optional[str] = "default"
    motivationalMessage: Optional[str] = None  # Mensaje personalizado por IA
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
    userId: str = "default_user"
    message: str
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actions: Optional[List[Dict]] = []  # Actions taken by Roxy

class ChatRequest(BaseModel):
    message: str
    userId: Optional[str] = "default_user"

class ChatResponse(BaseModel):
    response: str
    actions: List[Dict] = []

# ============== HELPER FUNCTIONS ==============

async def interpretar_comando_roxy(mensaje: str, alarmas_existentes: List[Alarma]) -> Dict:
    """
    Usa OpenAI para interpretar comandos en lenguaje natural
    y determinar qué acción tomar con las alarmas
    """
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    # Construir contexto con alarmas existentes
    contexto_alarmas = "\n".join([
        f"- {a.label}: {a.datetime} (Activa: {a.isActive}, Repetir: {a.repeatPattern})" 
        for a in alarmas_existentes
    ])
    
    system_message = f"""Eres Roxy, una asistente personal cariñosa y motivadora. Eres como una compañera de confianza que siempre está ahí para apoyar.

Tu trabajo es interpretar comandos del usuario sobre alarmas y responder de forma afectuosa pero firme.

Alarmas actuales del usuario:
{contexto_alarmas if contexto_alarmas else "No hay alarmas aún."}

IMPORTANTE: Debes responder SOLO con JSON válido, sin texto adicional.

Estructura JSON requerida:
{{
  "accion": "crear" | "listar" | "eliminar" | "modificar" | "desactivar" | "activar" | "info",
  "respuesta": "Tu respuesta motivadora y afectuosa en español",
  "parametros": {{
    "label": "Nombre de la alarma",
    "datetime": "YYYY-MM-DDTHH:MM:00.000Z",
    "repeatPattern": "daily" | "weekly" | "custom" | null,
    "repeatDays": ["monday", "tuesday", etc] o [],
    "alarmaId": "id si es modificar/eliminar"
  }}
}}

Ejemplos de respuestas afectuosas:
- "¡Listo! ❤️ Te acompaño en tu entrenamiento. Alarma configurada para gimnasio."
- "Perfecto! Vamos a estudiar juntos. Te aviso a las 19:00, dale con todo! 💪"
- "Aquí están tus alarmas de hoy. Estoy contigo en cada paso! 🌟"

REGLAS IMPORTANTES:
- Siempre responde SOLO JSON, sin texto antes o después
- Sé cariñosa y motivadora
- Usa emojis ocasionalmente para ser más cercana
- Cuando sea "entrenar" o "gimnasio", sé motivadora con el ejercicio
- Cuando sea "estudiar", sé inspiradora con el aprendizaje
- Cuando sea "trabajar" o "reunión", sé profesional pero apoyadora"""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"roxy_session_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        user_message = UserMessage(text=mensaje)
        response = await chat.send_message(user_message)
        
        # Parsear respuesta JSON con mejor manejo de errores
        import json
        import re
        
        # Limpiar la respuesta
        response_clean = response.strip()
        
        # Remover markdown si existe
        if response_clean.startswith("```"):
            # Buscar el JSON entre los bloques de código
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_clean, re.DOTALL)
            if json_match:
                response_clean = json_match.group(1)
            else:
                # Remover los backticks manualmente
                response_clean = response_clean.replace("```json", "").replace("```", "").strip()
        
        # Intentar parsear el JSON
        try:
            resultado = json.loads(response_clean)
        except json.JSONDecodeError:
            # Si falla, intentar extraer JSON del texto
            json_match = re.search(r'\{.*\}', response_clean, re.DOTALL)
            if json_match:
                resultado = json.loads(json_match.group(0))
            else:
                raise ValueError("No se pudo extraer JSON válido de la respuesta")
        
        # Validar estructura básica
        if "accion" not in resultado or "respuesta" not in resultado:
            raise ValueError("JSON no tiene la estructura esperada")
        
        return resultado
        
    except Exception as e:
        logger.error(f"Error en interpretar_comando_roxy: {str(e)}")
        logger.error(f"Respuesta original: {response if 'response' in locals() else 'No disponible'}")
        return {
            "accion": "info",
            "respuesta": f"Disculpa, tuve un problemita procesando eso. ¿Podrías intentar de nuevo? Estoy aquí para ayudarte. 💙",
            "parametros": {}
        }

async def generar_mensaje_motivacional(label: str) -> str:
    """
    Genera un mensaje personalizado con IA según el tipo de alarma
    """
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    system_message = f"""Eres Roxy, una asistente motivadora y cariñosa.

Genera un mensaje corto (máximo 12 palabras) y motivador para una alarma con este título: "{label}"

Ejemplos según el tipo:
- Para "Gimnasio", "Entrenar", "Ejercicio": "¡Hora de entrenar! Tu cuerpo te lo agradecerá 💪"
- Para "Estudiar", "Clase", "Leer": "A aprender! Tu futuro se construye hoy 📚✨"
- Para "Trabajar", "Reunión", "Oficina": "Momento de brillar profesionalmente! Tú puedes 🌟"
- Para "Dormir", "Descansar": "A descansar, mañana será un día increíble 🌙💙"
- Para "Meditar", "Yoga": "Tiempo para ti, relájate y respira 🧘‍♀️"
- Para cosas personales: Sé cariñosa y motivadora

Responde SOLO con el mensaje, sin comillas ni formato extra.
Usa emojis relevantes al final."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"motivational_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.0-flash")
        
        user_message = UserMessage(text="Genera el mensaje motivacional")
        response = await chat.send_message(user_message)
        return response.strip().strip('"').strip("'")
    except Exception as e:
        logger.error(f"Error generando mensaje motivacional: {str(e)}")
        # Mensaje por defecto cariñoso
        return "¡Es hora! Estoy contigo, vamos juntas 💙✨"

# ============== ROUTES - ALARMAS ==============

@api_router.post("/alarmas", response_model=Alarma)
async def crear_alarma(alarma: AlarmaCreate):
    """Crear una nueva alarma"""
    alarma_obj = Alarma(**alarma.dict())
    await db.alarmas.insert_one(alarma_obj.dict())
    return alarma_obj

@api_router.get("/alarmas", response_model=List[Alarma])
async def obtener_alarmas():
    """Obtener todas las alarmas"""
    alarmas = await db.alarmas.find().to_list(1000)
    return [Alarma(**alarma) for alarma in alarmas]

@api_router.get("/alarmas/{alarma_id}", response_model=Alarma)
async def obtener_alarma(alarma_id: str):
    """Obtener una alarma específica"""
    alarma = await db.alarmas.find_one({"id": alarma_id})
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return Alarma(**alarma)

@api_router.put("/alarmas/{alarma_id}", response_model=Alarma)
async def actualizar_alarma(alarma_id: str, update: AlarmaUpdate):
    """Actualizar una alarma"""
    alarma = await db.alarmas.find_one({"id": alarma_id})
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    await db.alarmas.update_one(
        {"id": alarma_id},
        {"$set": update_data}
    )
    
    alarma_actualizada = await db.alarmas.find_one({"id": alarma_id})
    return Alarma(**alarma_actualizada)

@api_router.delete("/alarmas/{alarma_id}")
async def eliminar_alarma(alarma_id: str):
    """Eliminar una alarma"""
    result = await db.alarmas.delete_one({"id": alarma_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return {"message": "Alarma eliminada exitosamente"}

# ============== ROUTES - ROXY CHAT ==============

@api_router.post("/chat", response_model=ChatResponse)
async def chat_con_roxy(request: ChatRequest):
    """Procesar un mensaje del usuario y ejecutar acciones"""
    
    # Obtener alarmas existentes para contexto
    alarmas = await db.alarmas.find().to_list(1000)
    alarmas_obj = [Alarma(**a) for a in alarmas]
    
    # Interpretar comando con OpenAI
    resultado = await interpretar_comando_roxy(request.message, alarmas_obj)
    
    acciones_realizadas = []
    
    # Ejecutar acción según lo interpretado
    accion = resultado.get("accion", "info")
    parametros = resultado.get("parametros", {})
    
    try:
        if accion == "crear":
            # Crear nueva alarma
            nueva_alarma = AlarmaCreate(
                label=parametros.get("label", "Alarma"),
                datetime=parametros.get("datetime"),
                repeatPattern=parametros.get("repeatPattern"),
                repeatDays=parametros.get("repeatDays", []),
                sound=parametros.get("sound", "default")
            )
            alarma_creada = await crear_alarma(nueva_alarma)
            acciones_realizadas.append({
                "tipo": "alarma_creada",
                "alarma": alarma_creada.dict()
            })
            
        elif accion == "eliminar":
            alarma_id = parametros.get("alarmaId")
            if alarma_id:
                await eliminar_alarma(alarma_id)
                acciones_realizadas.append({
                    "tipo": "alarma_eliminada",
                    "alarmaId": alarma_id
                })
                
        elif accion == "modificar" or accion == "desactivar" or accion == "activar":
            alarma_id = parametros.get("alarmaId")
            if alarma_id:
                update = AlarmaUpdate(
                    label=parametros.get("label"),
                    datetime=parametros.get("datetime"),
                    isActive=True if accion == "activar" else False if accion == "desactivar" else None
                )
                alarma_actualizada = await actualizar_alarma(alarma_id, update)
                acciones_realizadas.append({
                    "tipo": "alarma_actualizada",
                    "alarma": alarma_actualizada.dict()
                })
                
        elif accion == "listar":
            alarmas_actuales = await obtener_alarmas()
            acciones_realizadas.append({
                "tipo": "listar_alarmas",
                "alarmas": [a.dict() for a in alarmas_actuales]
            })
            
    except Exception as e:
        logger.error(f"Error ejecutando acción: {str(e)}")
        resultado["respuesta"] += f" Nota: Hubo un problema al ejecutar la acción."
    
    # Guardar conversación en BD
    chat_message = ChatMessage(
        userId=request.userId,
        message=request.message,
        response=resultado.get("respuesta", "Lo siento, no entendí."),
        actions=acciones_realizadas
    )
    await db.chat_history.insert_one(chat_message.dict())
    
    return ChatResponse(
        response=resultado.get("respuesta", "Lo siento, no entendí."),
        actions=acciones_realizadas
    )

@api_router.get("/chat/history", response_model=List[ChatMessage])
async def obtener_historial_chat(userId: str = "default_user", limit: int = 50):
    """Obtener historial de conversaciones"""
    mensajes = await db.chat_history.find(
        {"userId": userId}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return [ChatMessage(**msg) for msg in mensajes]

# ============== BASIC ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Roxy Backend API - Funcionando correctamente"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "roxy-api"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
