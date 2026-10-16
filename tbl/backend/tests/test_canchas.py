import pytest


@pytest.mark.asyncio
async def test_crud_canchas(client, admin_headers):
    # 1. Crear cancha nueva
    nueva_cancha = {
        "nombre": "Estadio Ángel Sandrín",
        "direccion": "Jujuy 2602",
        "ciudad": "Córdoba",
        "telefono": "351-4712345",
        "notas": "Estadio principal de Instituto ACC",
    }
    res_crear = client.post("/api/v1/canchas", json=nueva_cancha, headers=admin_headers)
    assert res_crear.status_code == 201
    cancha_id = res_crear.json()["id"]
    assert res_crear.json()["nombre"] == "Estadio Ángel Sandrín"
    assert res_crear.json()["activo"] is True

    # 2. Rechazar duplicado con el mismo nombre
    res_dup = client.post("/api/v1/canchas", json=nueva_cancha, headers=admin_headers)
    assert res_dup.status_code == 400

    # 3. Listar canchas
    res_list = client.get("/api/v1/canchas")
    assert res_list.status_code == 200
    nombres = [c["nombre"] for c in res_list.json()]
    assert "Estadio Ángel Sandrín" in nombres

    # 4. Actualizar cancha
    res_patch = client.patch(
        f"/api/v1/canchas/{cancha_id}",
        json={"telefono": "351-9998888", "notas": "Piso renovado 2026"},
        headers=admin_headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["telefono"] == "351-9998888"
    assert res_patch.json()["notas"] == "Piso renovado 2026"

    # 5. Soft-delete / desactivar cancha
    res_del = client.delete(f"/api/v1/canchas/{cancha_id}", headers=admin_headers)
    assert res_del.status_code == 200

    # No debe aparecer en listado público activo
    res_list_after = client.get("/api/v1/canchas")
    nombres_after = [c["nombre"] for c in res_list_after.json()]
    assert "Estadio Ángel Sandrín" not in nombres_after

    # Sí debe aparecer con ?todas=true
    res_list_todas = client.get("/api/v1/canchas?todas=true")
    assert any(c["id"] == cancha_id and c["activo"] is False for c in res_list_todas.json())
