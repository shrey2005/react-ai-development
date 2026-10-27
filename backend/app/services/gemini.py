import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3.5-flash-lite")

async def generate_text(prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text

async def stream_text(prompt: str):
    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text
