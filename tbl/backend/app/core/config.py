from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite+aiosqlite:///./tbl.db"
    secret_key: str = "dev-only-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "tbl-fotos"
    minio_public_url: str = "http://localhost:9000/tbl-fotos"

    cors_origins: str = "http://localhost:5173,http://localhost:8000,https://torneobasquet.onrender.com"
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()