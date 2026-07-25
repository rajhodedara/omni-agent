import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
import httpx
from src.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts an audio file upload and uses Groq's Whisper API to transcribe it.
    """
    settings = get_settings()
    
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")
        
    try:
        content = await file.read()
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}"
            }
            # Using OpenAI compatible endpoint provided by Groq
            files = {
                "file": (file.filename or "audio.webm", content, file.content_type or "audio/webm")
            }
            data = {
                "model": "whisper-large-v3-turbo", # Groq provides whisper-large-v3 and whisper-large-v3-turbo
                "response_format": "json"
            }
            
            # Note: Groq's STT endpoint
            resp = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data,
                timeout=30.0
            )
            
            if resp.status_code != 200:
                logger.error(f"Groq API error: {resp.text}")
                raise HTTPException(status_code=resp.status_code, detail="Failed to transcribe audio")
                
            result = resp.json()
            return {"text": result.get("text", "")}
            
    except Exception as e:
        logger.error(f"Error during transcription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
