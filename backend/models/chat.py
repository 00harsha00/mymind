from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class Attachment(BaseModel):
    type: str
    content: str
    filename: Optional[str] = None

class Features(BaseModel):
    optimize_tokens: bool = False
    web_search: bool = False
    cite_sources: bool = False
    memory: bool = False
    follow_ups: bool = False
    auto_detect_task: bool = True
    code_reviewer: bool = False
    agent_mode: bool = False

class Personalization(BaseModel):
    name: Optional[str] = None
    about: Optional[str] = None
    instructions: Optional[str] = None
    responseStyle: Optional[str] = "balanced"

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    user_id: Optional[str] = None
    model: str = "claude-sonnet-4-6"
    attachments: List[Attachment] = []
    features: Features = Features()
    personalization: Optional[Personalization] = None
