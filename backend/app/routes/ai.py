from fastapi import APIRouter, HTTPException
from app.schemas.ai import AIRequest, AIResponse
from app.services.gemini import generate_text

router = APIRouter()

@router.post("/generate", response_model=AIResponse)
async def generate_route(request: AIRequest):
    try:
        text = await generate_text(request.prompt)
        return AIResponse(data=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))