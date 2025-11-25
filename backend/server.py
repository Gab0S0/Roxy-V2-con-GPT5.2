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
    
    system_message = f"""Eres Roxy, un asistente personal directo y motivador.

Tu trabajo es interpretar comandos del usuario sobre alarmas y responder de forma breve y firme.

Alarmas actuales del usuario:
{contexto_alarmas if contexto_alarmas else "No hay alarmas aún."}

Debes responder en formato JSON con esta estructura:
{{
  "accion": "crear" | "listar" | "eliminar" | "modificar" | "desactivar" | "activar" | "info",
  "respuesta": "Tu respuesta motivadora y directa en español",
  "parametros": {{
    "label": "Nombre de la alarma",
    "datetime": "ISO datetime string",
    "repeatPattern": "daily" | "weekly" | "custom" | null,
    "repeatDays": ["monday", "tuesday", etc] o [],
    "alarmaId": "id si es modificar/eliminar"
  }}
}}

Ejemplos de respuestas:
- "Listo. Alarma creada: Gimnasio martes y jueves 21:00. Sin excusas."
- "Perfecto. Te aviso todos los días a las 19:00 para estudiar IA. Dale con todo."
- "Estas son tus alarmas activas para hoy: [lista]. Prepárate."

Siempre responde en español, sé directo y motivador."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"roxy_session_{datetime.now().timestamp()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=mensaje)
        response = await chat.send_message(user_message)
        
        # Parsear respuesta JSON
        import json
        # Limpiar la respuesta si viene con markdown
        response_clean = response.strip()
        if response_clean.startswith("```json"):
            response_clean = response_clean[7:]
        if response_clean.endswith("```"):
            response_clean = response_clean[:-3]
        
        resultado = json.loads(response_clean.strip())
        return resultado
        
    except Exception as e:
        logger.error(f"Error en interpretar_comando_roxy: {str(e)}")
        return {
            "accion": "error",
            "respuesta": f"Lo siento, tuve un problema: {str(e)}",
            "parametros": {}
        }

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
