"""Pruebas de ciberseguridad y defensas implementadas."""
import pytest
from app.core.rate_limit import login_rate_limiter


def test_security_headers_present(client):
    """Verifica que las cabeceras HTTP de seguridad requeridas estén presentes."""
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in headers.get("permissions-policy", "")


def test_login_rate_limiting(client):
    """Verifica que tras 5 intentos fallidos consecutivos se active el HTTP 429 Too Many Requests."""
    rate_key = "login:testclient:hacker"
    login_rate_limiter.reset(rate_key)

    for i in range(5):
        res = client.post(
            "/api/v1/auth/login",
            json={"usuario": "hacker", "password": "wrong_password"},
        )
        assert res.status_code == 401

    # El 6to intento debe ser bloqueado por Rate Limit
    res_bloqueado = client.post(
        "/api/v1/auth/login",
        json={"usuario": "hacker", "password": "wrong_password"},
    )
    assert res_bloqueado.status_code == 429
    assert "Demasiados intentos fallidos" in res_bloqueado.json()["detail"]
    assert "Retry-After" in res_bloqueado.headers

    # Limpiar estado para no afectar otras pruebas
    login_rate_limiter.reset(rate_key)


def test_upload_escudo_rechaza_falso_png(client, admin_headers):
    """Verifica que un archivo con extensión .png pero sin bytes mágicos sea rechazado."""
    fake_png = b"ESTO NO ES UN ARCHIVO PNG VALIDO"
    res = client.post(
        "/api/v1/equipos/upload-escudo",
        files={"file": ("malicioso.png", fake_png, "image/png")},
        headers=admin_headers,
    )
    assert res.status_code == 400
    assert "no es una imagen PNG válida" in res.json()["detail"]


def test_upload_escudo_rechaza_svg_con_script(client, admin_headers):
    """Verifica que un SVG con scripts incrustados (Stored XSS) sea rechazado."""
    malicious_svg = b'<svg><script>alert("XSS")</script></svg>'
    res = client.post(
        "/api/v1/equipos/upload-escudo",
        files={"file": ("xss.svg", malicious_svg, "image/svg+xml")},
        headers=admin_headers,
    )
    assert res.status_code == 400
    assert "scripts no permitidos" in res.json()["detail"]


def test_rechazo_javascript_url_en_equipo(client, admin_headers):
    """Verifica que no se permitan URLs con esquema javascript: en creación de equipos."""
    payload = {
        "nombre": "Equipo Peligroso",
        "escudo_url": "javascript:alert(document.cookie)",
    }
    res = client.post("/api/v1/equipos", json=payload, headers=admin_headers)
    assert res.status_code == 422
