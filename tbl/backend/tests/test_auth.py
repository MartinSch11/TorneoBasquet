"""Test del flujo de autenticación y roles."""


async def test_login_ok(client) -> None:
    res = client.post("/api/v1/auth/login", json={"usuario": "admin", "password": "admin123"})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["rol"] == "admin"
    assert body["access_token"]


async def test_login_incorrecto(client) -> None:
    res = client.post("/api/v1/auth/login", json={"usuario": "admin", "password": "mal"})
    assert res.status_code == 401
    assert "incorrectos" in res.json()["detail"]


async def test_me(client, admin_token) -> None:
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["usuario"] == "admin"


async def test_me_sin_token(client) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


async def test_crear_usuario_y_roles(client, admin_headers) -> None:
    res = client.post(
        "/api/v1/auth/usuarios",
        json={"usuario": "jorge", "password": "pass12", "rol": "visitante"},
        headers=admin_headers,
    )
    assert res.status_code == 201

    # un visitante no puede listar usuarios
    tok = client.post("/api/v1/auth/login", json={"usuario": "jorge", "password": "pass12"}).json()["access_token"]
    res = client.get("/api/v1/auth/usuarios", headers={"Authorization": f"Bearer {tok}"})
    assert res.status_code == 403


async def test_crear_usuario_sin_auth(client) -> None:
    res = client.post("/api/v1/auth/usuarios", json={"usuario": "x", "password": "xxxx", "rol": "admin"})
    assert res.status_code == 401 or res.status_code == 403


async def test_patch_usuario(client, admin_headers) -> None:
    res = client.get("/api/v1/auth/usuarios", headers=admin_headers)
    target = next((u for u in res.json() if u["usuario"] == "jorge"), res.json()[-1])
    uid = target["id"]
    res = client.patch(f"/api/v1/auth/usuarios/{uid}", json={"activo": False}, headers=admin_headers)
    assert res.status_code == 200 and res.json()["activo"] is False


async def test_prevenir_auto_desactivacion_admin(client, admin_headers) -> None:
    # Obtener el id del admin autenticado
    me_res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    admin_id = me_res.json()["id"]

    # Intentar desactivarse a sí mismo -> 400
    res_deact = client.patch(f"/api/v1/auth/usuarios/{admin_id}", json={"activo": False}, headers=admin_headers)
    assert res_deact.status_code == 400
    assert "No podés desactivar" in res_deact.json()["detail"]