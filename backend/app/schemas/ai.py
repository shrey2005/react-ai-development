from typing import Optional
from pydantic import BaseModel

class AIRequest(BaseModel):
    prompt: str
    streaming: Optional[bool] = False

class AIResponse(BaseModel):
    data: str
