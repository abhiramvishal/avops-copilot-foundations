from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    app_name: str = "AVOps Copilot – Internal AI Tooling (Foundations)"
    env: str = "dev"  # dev | prod | test
    debug: bool = True
    
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    cors_origins: List[str] = ["http://localhost:3000"]

    database_url: str = "sqlite:///./avops.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
