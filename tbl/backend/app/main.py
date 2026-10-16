from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import setup_exception_handlers
from app.core.logging_config import setup_logging
from app.core.security_headers import SecurityHeadersMiddleware
from app.routers import auth, cancha, estadisticas, galeria, inicio, torneo

settings = get_settings()
setup_logging(settings.log_level)

api = APIRouter(prefix="/api/v1")
api.include_router(auth.router, prefix="/auth", tags=["auth"])
api.include_router(torneo.router, tags=["torneo"])
api.include_router(estadisticas.router, prefix="/estadisticas", tags=["estadisticas"])
api.include_router(galeria.router, prefix="/galeria", tags=["galeria"])
api.include_router(inicio.router, tags=["inicio"])
api.include_router(cancha.router, prefix="/canchas", tags=["canchas"])

app = FastAPI(
    title="LBA API",
    description="API del sistema LBA — Liga de Básquetbol Amateur",
    version="0.1.0",
)

setup_exception_handlers(app)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

app.include_router(api)

from pathlib import Path
from starlette.staticfiles import StaticFiles

uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory=uploads_dir), name="api_uploads")
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}