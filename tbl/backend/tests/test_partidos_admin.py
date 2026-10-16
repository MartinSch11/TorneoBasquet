import pytest
from app.models import Equipo, Inscripcion, Torneo


async def test_admin_crear_y_cargar_resultado_partido(client, admin_headers, db_session):
    # Torneo y equipos aislados
    t = Torneo(nombre="Torneo Test Partidos", edicion=2, categoria="TBL B", temporada="2026", estado="activo")
    e1 = Equipo(nombre="Equipo Alfa")
    e2 = Equipo(nombre="Equipo Beta")
    db_session.add_all([t, e1, e2])
    await db_session.flush()
    db_session.add_all([
        Inscripcion(torneo_id=t.id, equipo_id=e1.id),
        Inscripcion(torneo_id=t.id, equipo_id=e2.id),
    ])
    await db_session.commit()

    # 1. Crear nuevo partido
    nuevo_partido = {
        "torneo_id": t.id,
        "fecha_numero": 1,
        "equipo_local_id": e1.id,
        "equipo_visitante_id": e2.id,
        "fase": "FASE REGULAR",
        "cancha": "Cancha Central",
    }
    res = client.post("/api/v1/partidos", json=nuevo_partido, headers=admin_headers)
    assert res.status_code == 201
    partido_id = res.json()["id"]

    # 2. Cargar resultado
    res_score = client.post(
        f"/api/v1/partidos/{partido_id}/resultado",
        json={"pts_local": 75, "pts_visitante": 72},
        headers=admin_headers,
    )
    assert res_score.status_code == 200
    assert res_score.json()["pts_local"] == 75
    assert res_score.json()["pts_visitante"] == 72

    # 3. Consultar resultados y verificar que aparece con sus IDs
    res_resultados = client.get(f"/api/v1/torneos/{t.id}/resultados")
    assert res_resultados.status_code == 200
    resultados = res_resultados.json()
    partido_cargado = next((p for p in resultados if p["id"] == partido_id), None)
    assert partido_cargado is not None
    assert partido_cargado["pts_local"] == 75
    assert partido_cargado["pts_visitante"] == 72
    assert partido_cargado["equipo_local_id"] == e1.id
    assert partido_cargado["equipo_visitante_id"] == e2.id


def test_obtener_estadisticas_partido(client):
    res = client.get("/api/v1/partidos/1/estadisticas")
    assert res.status_code == 200
    stats = res.json()
    assert len(stats) >= 1
    assert "puntos" in stats[0]


def test_upload_escudo_equipo(client, admin_headers):
    # Archivo PNG simulado en memoria
    file_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    res = client.post(
        "/api/v1/equipos/upload-escudo",
        files={"file": ("test_logo.png", file_bytes, "image/png")},
        headers=admin_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["url"].startswith("/api/v1/uploads/escudos/")


async def test_crear_y_eliminar_jugador_plantel(client, admin_headers, db_session):
    e = Equipo(nombre="Equipo Para Plantel")
    db_session.add(e)
    await db_session.commit()

    # Inscribir jugador
    res_add = client.post(
        f"/api/v1/equipos/{e.id}/jugadores",
        json={"nombre": "Lautaro", "apellido": "Martínez", "numero": 10},
        headers=admin_headers,
    )
    assert res_add.status_code == 201
    jugador_id = res_add.json()["id"]

    # Verificar que aparece en el equipo
    res_eq = client.get(f"/api/v1/equipos/{e.id}")
    assert res_eq.status_code == 200
    assert any(j["id"] == jugador_id for j in res_eq.json()["jugadores"])

    # Eliminar jugador
    res_del = client.delete(
        f"/api/v1/equipos/{e.id}/jugadores/{jugador_id}",
        headers=admin_headers,
    )
    assert res_del.status_code == 200

    # Verificar que ya no figura en el plantel activo
    res_eq2 = client.get(f"/api/v1/equipos/{e.id}")
    assert res_eq2.status_code == 200
    assert not any(j["id"] == jugador_id for j in res_eq2.json()["jugadores"])


def test_crear_y_eliminar_torneo(client, admin_headers):
    # Crear torneo categoria TBL B
    nuevo_torneo = {
        "nombre": "Liga Amateur",
        "edicion": 2,
        "categoria": "TBL B",
        "temporada": "2026",
        "estado": "activo",
    }
    res = client.post("/api/v1/torneos", json=nuevo_torneo, headers=admin_headers)
    assert res.status_code == 201
    torneo_data = res.json()
    assert torneo_data["categoria"] == "TBL B"
    t_id = torneo_data["id"]

    # Listar torneos y verificar
    res_list = client.get("/api/v1/torneos")
    assert res_list.status_code == 200
    assert any(t["id"] == t_id for t in res_list.json())

    # Soft delete torneo
    res_del = client.delete(f"/api/v1/torneos/{t_id}", headers=admin_headers)
    assert res_del.status_code == 200

    # Verificar que ya no aparece en lista activa
    res_list2 = client.get("/api/v1/torneos")
    assert res_list2.status_code == 200
    assert not any(t["id"] == t_id for t in res_list2.json())


async def test_editar_jugador(client, admin_headers, db_session):
    e = Equipo(nombre="Equipo Editar Jugador")
    db_session.add(e)
    await db_session.commit()

    res_add = client.post(
        f"/api/v1/equipos/{e.id}/jugadores",
        json={"nombre": "Carlos", "apellido": "Tevez", "numero": 32},
        headers=admin_headers,
    )
    assert res_add.status_code == 201
    j_id = res_add.json()["id"]

    # Editar dorsal y apellido
    res_patch = client.patch(
        f"/api/v1/equipos/{e.id}/jugadores/{j_id}",
        json={"numero": 10, "apellido": "Tévez"},
        headers=admin_headers,
    )
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["numero"] == 10
    assert patched["apellido"] == "Tévez"
    assert patched["nombre"] == "Carlos Tévez"


async def test_soft_delete_equipo(client, admin_headers, db_session):
    e = Equipo(nombre="Equipo Para Soft Delete")
    db_session.add(e)
    await db_session.commit()

    # Soft delete equipo
    res_del = client.delete(f"/api/v1/equipos/{e.id}", headers=admin_headers)
    assert res_del.status_code == 200

    # Verificar que ya no figura en /equipos
    res_list = client.get("/api/v1/equipos")
    assert res_list.status_code == 200
    assert not any(eq["id"] == e.id for eq in res_list.json())


async def test_reactivar_equipo(client, admin_headers, db_session):
    e = Equipo(nombre="Equipo Reactivar Test", activo=False)
    db_session.add(e)
    await db_session.commit()

    # Verificar que no figura sin todos=true
    res_list = client.get("/api/v1/equipos")
    assert res_list.status_code == 200
    assert not any(eq["id"] == e.id for eq in res_list.json())

    # Verificar que sí figura con todos=true
    res_todos = client.get("/api/v1/equipos?todos=true")
    assert res_todos.status_code == 200
    assert any(eq["id"] == e.id and eq["activo"] is False for eq in res_todos.json())

    # Reactivar equipo
    res_react = client.patch(f"/api/v1/equipos/{e.id}/reactivar", headers=admin_headers)
    assert res_react.status_code == 200

    # Ahora sí figura en /equipos por defecto
    res_list_after = client.get("/api/v1/equipos")
    assert res_list_after.status_code == 200
    assert any(eq["id"] == e.id and eq["activo"] is True for eq in res_list_after.json())


async def test_admin_actualizar_y_eliminar_partido(client, admin_headers, db_session):
    t = Torneo(nombre="Torneo Patch Delete", edicion=1, categoria="TBL A", temporada="2026", estado="activo")
    e1 = Equipo(nombre="Equipo Uno Patch")
    e2 = Equipo(nombre="Equipo Dos Patch")
    db_session.add_all([t, e1, e2])
    await db_session.flush()
    db_session.add_all([
        Inscripcion(torneo_id=t.id, equipo_id=e1.id),
        Inscripcion(torneo_id=t.id, equipo_id=e2.id),
    ])
    await db_session.commit()

    # 1. Crear partido
    res_create = client.post(
        "/api/v1/partidos",
        json={
            "torneo_id": t.id,
            "fecha_numero": 1,
            "equipo_local_id": e1.id,
            "equipo_visitante_id": e2.id,
            "cancha": "Cancha 1",
        },
        headers=admin_headers,
    )
    assert res_create.status_code == 201
    pid = res_create.json()["id"]

    # 2. Intentar duplicar partido idéntico en la misma fecha (debe rechazar 400)
    res_dup = client.post(
        "/api/v1/partidos",
        json={
            "torneo_id": t.id,
            "fecha_numero": 1,
            "equipo_local_id": e1.id,
            "equipo_visitante_id": e2.id,
        },
        headers=admin_headers,
    )
    assert res_dup.status_code == 400

    # 3. Actualizar partido (cancha y fase)
    res_patch = client.patch(
        f"/api/v1/partidos/{pid}",
        json={"cancha": "Estadio Principal", "fase": "PLAYOFFS"},
        headers=admin_headers,
    )
    assert res_patch.status_code == 200

    # 4. Eliminar partido
    res_del = client.delete(f"/api/v1/partidos/{pid}", headers=admin_headers)
    assert res_del.status_code == 200

    # Verificar que ya no existe
    res_del2 = client.delete(f"/api/v1/partidos/{pid}", headers=admin_headers)
    assert res_del2.status_code == 404


async def test_admin_inscribir_y_desinscribir_equipo_torneo(client, admin_headers, db_session):
    t = Torneo(nombre="Torneo Inscribir", edicion=1, categoria="TBL C", temporada="2026", estado="activo")
    e = Equipo(nombre="Equipo Inscribir Test")
    db_session.add_all([t, e])
    await db_session.commit()

    # Inscribir
    res_ins = client.post(
        f"/api/v1/torneos/{t.id}/equipos",
        json={"torneo_id": t.id, "equipo_id": e.id},
        headers=admin_headers,
    )
    assert res_ins.status_code == 201

    # Inscribir duplicado -> 400
    res_ins_dup = client.post(
        f"/api/v1/torneos/{t.id}/equipos",
        json={"torneo_id": t.id, "equipo_id": e.id},
        headers=admin_headers,
    )
    assert res_ins_dup.status_code == 400

    # Desinscribir
    res_des = client.delete(f"/api/v1/torneos/{t.id}/equipos/{e.id}", headers=admin_headers)
    assert res_des.status_code == 200


