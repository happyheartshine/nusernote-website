"""Configuration management for NurseNote AI backend."""

import os
from typing import List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    # Supabase Configuration
    SUPABASE_PROJECT_URL: str = os.getenv("SUPABASE_PROJECT_URL", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # CORS Configuration
    ALLOWED_ORIGINS_ENV: str = os.getenv("ALLOWED_ORIGINS", "")
    DEFAULT_DEV_ORIGINS: List[str] = ["*"]

    @property
    def allowed_origins(self) -> List[str]:
        """Parse and return allowed CORS origins."""
        if self.ALLOWED_ORIGINS_ENV:
            return [
                origin.strip()
                for origin in self.ALLOWED_ORIGINS_ENV.split(",")
                if origin.strip()
            ]
        return self.DEFAULT_DEV_ORIGINS

    # API Configuration
    API_TITLE: str = "NurseNote AI Backend"
    API_DESCRIPTION: str = "Generate SOAP＋看護計画 for psychiatric home-visit nursing."
    API_VERSION: str = "1.0.0"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    RELOAD: bool = os.getenv("RELOAD", "false").lower() == "true"

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-1")
    AWS_S3_BUCKET_NAME: str = os.getenv("AWS_S3_BUCKET_NAME", "")
    AWS_S3_PRESIGNED_URL_EXPIRATION: int = int(os.getenv("AWS_S3_PRESIGNED_URL_EXPIRATION", "3600"))  # 1 hour default

    def validate(self) -> None:
        """Validate required settings."""
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required.")


# Global settings instance
settings = Settings()

