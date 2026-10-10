"""
AgriSÄrathi â€” Core Configuration

Centralizes application settings loaded from environment variables.
Uses pydantic-settings for typed, validated configuration.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from .env or environment variables."""

    # --- Application ---
    app_name: str = "AgriSÄrathi"
    app_version: str = "0.2.0"
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=True, alias="APP_DEBUG")
    app_port: int = Field(default=8000, alias="APP_PORT")

    # --- Database ---
    database_url: str = Field(
        default="sqlite:///./agrisarathi.db",
        alias="DATABASE_URL",
    )

    # --- Frontend ---
    frontend_url: str = Field(
        default="http://localhost:3000",
        alias="FRONTEND_URL",
    )

    # --- External Services ---
    weather_api_url: str = Field(
        default="https://api.open-meteo.com/v1/forecast",
        alias="WEATHER_API_URL",
    )
    rag_collection_name: str = Field(
        default="agricultural_knowledge",
        alias="RAG_COLLECTION_NAME",
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton settings instance
settings = Settings()
