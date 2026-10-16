import logging
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


def _format_validation_error(exc: RequestValidationError) -> str:
    """Genera un mensaje legible para el usuario a partir de los errores de validación de Pydantic."""
    mensajes = []
    for err in exc.errors():
        loc_items = [str(item) for item in err.get("loc", []) if item != "body"]
        loc = " -> ".join(loc_items)
        msg = err.get("msg", "Dato inválido")
        if loc:
            mensajes.append(f"{loc}: {msg}")
        else:
            mensajes.append(msg)
    if not mensajes:
        return "Error de validación en los datos enviados."
    return "Error de validación: " + "; ".join(mensajes)


def setup_exception_handlers(app: FastAPI) -> None:
    """Registra manejadores de excepciones globales y profesionales en la aplicación FastAPI."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Registrar advertencia para 4xx sensibles o error para 5xx
        if exc.status_code >= 500:
            logger.error(
                "HTTP %s en %s %s: %s",
                exc.status_code,
                request.method,
                request.url.path,
                exc.detail,
            )
        elif exc.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_429_TOO_MANY_REQUESTS,
        ):
            logger.warning(
                "HTTP %s en %s %s: %s",
                exc.status_code,
                request.method,
                request.url.path,
                exc.detail,
            )

        headers = getattr(exc, "headers", None)
        detail = exc.detail if isinstance(exc.detail, (str, dict, list)) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": detail},
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        mensaje_amigable = _format_validation_error(exc)
        logger.warning(
            "Fallo de validación 422 en %s %s: %s",
            request.method,
            request.url.path,
            mensaje_amigable,
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": mensaje_amigable,
                "errors": jsonable_encoder(exc.errors()),
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        logger.warning(
            "Error de integridad en base de datos en %s %s: %s",
            request.method,
            request.url.path,
            str(exc.orig or exc),
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Conflicto de integridad de datos: el registro ya existe o una clave referenciada no es válida.",
            },
        )

    default_500_headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.error(
            "Error de base de datos en %s %s: %s",
            request.method,
            request.url.path,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error en la base de datos al procesar la solicitud."},
            headers=default_500_headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Excepción no controlada en %s %s: %s",
            request.method,
            request.url.path,
            exc,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Ocurrió un error interno en el servidor."},
            headers=default_500_headers,
        )
