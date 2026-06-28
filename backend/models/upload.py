from pydantic import BaseModel

class UploadResponse(BaseModel):
    success: bool
    filename: str
    type: str
    content: str
    char_count: int
    estimated_tokens: int
