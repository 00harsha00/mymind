from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
