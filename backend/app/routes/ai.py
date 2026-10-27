import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.ai import AIRequest, AIResponse
from app.services.gemini import generate_text, stream_text

router = APIRouter()

@router.post("/generate")
async def generate_route(request: AIRequest):
    try:
        # await asyncio.sleep(5)
        if request.streaming:
            return StreamingResponse(stream_text(request.prompt), media_type="text/event-stream")
        text = await generate_text(request.prompt)
        return AIResponse(data=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
