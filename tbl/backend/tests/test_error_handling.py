"""Pruebas de la arquitectura centralizada de manejo de errores y logging."""
import pytest
from fastapi import APIRouter
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from app.main import app

# Router de prueba para verificar excepciones no controladas y de integridad
router_errors = APIRouter(prefix="/test-errors")


@router_errors.get("/unhandled-500")
async def trigger_unhandled_500():
    raise RuntimeError("Fallo crítico simulado en runtime")


@router_errors.get("/integrity-409")
async def trigger_integrity_409():
    raise IntegrityError("statement", "params", "orig exception simulada")


app.include_router(router_errors)


def test_404_not_found_json_response(client):
    """Verifica que un endpoint inexistente devuelva JSON 404 homogéneo con cabeceras de seguridad."""
    res = client.get("/api/v1/ruta-inexistente-totalmente-aleatoria")
    assert res.status_code == 404
    assert res.headers.get("content-type") == "application/json"
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    data = res.json()
    assert "detail" in data
    assert data["detail"] == "Not Found"


def test_422_validation_error_structure(client):
    """Verifica que los fallos de validación devuelvan status 422 con detail legible y lista de errors."""
    # Enviar payload incompleto/inválido a login
    res = client.post("/api/v1/auth/login", json={})
    assert res.status_code == 422
    assert res.headers.get("content-type") == "application/json"
    data = res.json()

    assert "detail" in data
    # detail debe ser un string legible para evitar que React rompa con 'Objects are not valid as a React child'
    assert isinstance(data["detail"], str)
    assert "Error de validación" in data["detail"]
    assert "usuario" in data["detail"] or "password" in data["detail"]

    # errors debe contener la lista detallada de Pydantic
    assert "errors" in data
    assert isinstance(data["errors"], list)
    assert len(data["errors"]) > 0


def test_500_unhandled_exception_returns_clean_json():
    """Verifica que una excepción no controlada retorne HTTP 500 en JSON sin exponer trazas internas."""
    client_no_raise = TestClient(app, raise_server_exceptions=False)
    res = client_no_raise.get("/test-errors/unhandled-500")
    assert res.status_code == 500
    assert res.headers.get("content-type") == "application/json"
    assert res.headers.get("x-content-type-options") == "nosniff"

    data = res.json()
    assert "detail" in data
    assert data["detail"] == "Ocurrió un error interno en el servidor."
    # Asegurar que el mensaje de error interno o traza NO se expone al cliente
    assert "Fallo crítico simulado" not in res.text
    assert "Traceback" not in res.text


def test_integrity_error_returns_409_conflict(client):
    """Verifica que una violación de integridad de base de datos se traduzca en 409 Conflict."""
    res = client.get("/test-errors/integrity-409")
    assert res.status_code == 409
    assert res.headers.get("content-type") == "application/json"
    data = res.json()
    assert "detail" in data
    assert "Conflicto de integridad de datos" in data["detail"]
