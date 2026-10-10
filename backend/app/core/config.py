import os
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    PROJECT_NAME: str = "TRACE-X"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'trace_x.db'}")
    
    # Evidence storage directory
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "evidence"))).resolve()
    
    # Limits & Security
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(50 * 1024 * 1024))) # 50 MB
    ALLOWED_EXTENSIONS: set[str] = {".txt", ".log", ".csv", ".json", ".eml"}
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # AI settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "deterministic") # "deterministic", "ollama", "openai"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OLLAMA_ENDPOINT: str = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")

settings = Settings()

# Ensure storage directory exists
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
