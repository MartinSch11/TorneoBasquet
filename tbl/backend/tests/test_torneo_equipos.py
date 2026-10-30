import pytest
from app.models import Equipo, Fecha, Inscripcion, Torneo, Partido


async def test_admin_listar_equipos_torneo_estado(client, admin_headers, db_session):
    t = Torneo(nombre="Torneo Test Equipos", edicion=1, categoria="LBA A", temporada="2026", estado="activo")
    f = Fecha(torneo=t, numero=1)
    e1 = Equipo(nombre="Equipo Inscripto Con Partido")
    e2 = Equipo(nombre="Equipo Inscripto Sin Partido")
    e3 = Equipo(nombre="Equipo Libre")
    db_session.add_all([t, f, e1, e2, e3])
    await db_session.flush()

    db_session.add_all([
        Inscripcion(torneo_id=t.id, equipo_id=e1.id),
        Inscripcion(torneo_id=t.id, equipo_id=e2.id),
    ])
    p = Partido(
        fecha_id=f.id,
        torneo_id=t.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        jugado=True,
        pts_local=80,
        pts_visitante=70,
    )
    db_session.add(p)
    await db_session.commit()

    res = client.get(f"/api/v1/torneos/{t.id}/equipos", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3

    item_e1 = next(item for item in data if item["id"] == e1.id)
    assert item_e1["inscripto"] is True
    assert item_e1["partidos_jugados"] == 1

    item_e2 = next(item for item in data if item["id"] == e2.id)
    assert item_e2["inscripto"] is True
    assert item_e2["partidos_jugados"] == 1

    item_e3 = next(item for item in data if item["id"] == e3.id)
    assert item_e3["inscripto"] is False
    assert item_e3["partidos_jugados"] == 0


async def test_admin_copiar_equipos_de_otro_torneo(client, admin_headers, db_session):
    t_orig = Torneo(nombre="Torneo Clausura", edicion=1, categoria="LBA A", temporada="2025", estado="finalizado")
    t_dest = Torneo(nombre="Torneo Apertura", edicion=2, categoria="LBA A", temporada="2026", estado="activo")
    e1 = Equipo(nombre="Club Copiado 1")
    e2 = Equipo(nombre="Club Copiado 2")
    db_session.add_all([t_orig, t_dest, e1, e2])
    await db_session.flush()

    db_session.add_all([
        Inscripcion(torneo_id=t_orig.id, equipo_id=e1.id),
        Inscripcion(torneo_id=t_orig.id, equipo_id=e2.id),
    ])
    await db_session.commit()

    # Copiar equipos a t_dest
    res = client.post(
        f"/api/v1/torneos/{t_dest.id}/copiar-equipos",
        json={"torneo_origen_id": t_orig.id},
        headers=admin_headers,
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["copiados"] == 2

    # Verificar que ahora están inscriptos en t_dest
    res_equipos = client.get(f"/api/v1/torneos/{t_dest.id}/equipos", headers=admin_headers)
    assert res_equipos.status_code == 200
    inscriptos = [x for x in res_equipos.json() if x["inscripto"]]
    inscriptos_ids = [x["id"] for x in inscriptos]
    assert e1.id in inscriptos_ids
    assert e2.id in inscriptos_ids

    # Copiar de nuevo no debe duplicar (copiados == 0)
    res_dup = client.post(
        f"/api/v1/torneos/{t_dest.id}/copiar-equipos",
        json={"torneo_origen_id": t_orig.id},
        headers=admin_headers,
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["copiados"] == 0


async def test_copiar_equipos_mismo_torneo_error(client, admin_headers, db_session):
    t = Torneo(nombre="Torneo Mismo", edicion=1, categoria="LBA A", temporada="2026", estado="activo")
    db_session.add(t)
    await db_session.commit()

    res = client.post(
        f"/api/v1/torneos/{t.id}/copiar-equipos",
        json={"torneo_origen_id": t.id},
        headers=admin_headers,
    )
    assert res.status_code == 400


async def test_no_permite_inscribir_en_dos_categorias_misma_temporada(client, admin_headers, db_session):
    t1 = Torneo(nombre="LBA 2026", edicion=1, categoria="LBA A", temporada="2026", estado="activo")
    t2 = Torneo(nombre="LBA 2026", edicion=1, categoria="LBA B", temporada="2026", estado="activo")
    eq = Equipo(nombre="Club Mitre")
    db_session.add_all([t1, t2, eq])
    await db_session.commit()

    # Inscribir en t1 (LBA A)
    res1 = client.post(
        f"/api/v1/torneos/{t1.id}/equipos",
        json={"equipo_id": eq.id},
        headers=admin_headers,
    )
    assert res1.status_code == 201

    # Intentar inscribir en t2 (LBA B de la misma temporada) debe fallar con 400
    res2 = client.post(
        f"/api/v1/torneos/{t2.id}/equipos",
        json={"equipo_id": eq.id},
        headers=admin_headers,
    )
    assert res2.status_code == 400
    assert "ya está inscripto en la categoría 'LBA A'" in res2.json()["detail"]

    # Verificar que el listado de t2 indica que eq está en LBA A
    res_list = client.get(f"/api/v1/torneos/{t2.id}/equipos", headers=admin_headers)
    assert res_list.status_code == 200
    item = next(x for x in res_list.json() if x["id"] == eq.id)
    assert item["inscripto"] is False
    assert item["otra_categoria"] == "LBA A"


async def test_ficha_equipo_con_partidos_disputados(client, db_session):
    from datetime import date
    t = Torneo(nombre="Torneo Ficha", edicion=22, categoria="TBL A", grupo="GRUPO 1", temporada="2026", estado="activo")
    f1 = Fecha(torneo=t, numero=1, fecha=date(2026, 8, 4))
    f2 = Fecha(torneo=t, numero=2, fecha=date(2026, 8, 8))
    e1 = Equipo(nombre="SANTA YOFRE")
    e2 = Equipo(nombre="FIRPO BLUNTS")
    db_session.add_all([t, f1, f2, e1, e2])
    await db_session.flush()

    db_session.add_all([
        Inscripcion(torneo_id=t.id, equipo_id=e1.id),
        Inscripcion(torneo_id=t.id, equipo_id=e2.id),
    ])
    p1 = Partido(
        fecha_id=f1.id,
        torneo_id=t.id,
        equipo_local_id=e1.id,
        equipo_visitante_id=e2.id,
        jugado=True,
        pts_local=51,
        pts_visitante=44,
        fase="FASE REGULAR",
    )
    p2 = Partido(
        fecha_id=f2.id,
        torneo_id=t.id,
        equipo_local_id=e2.id,
        equipo_visitante_id=e1.id,
        jugado=True,
        pts_local=71,
        pts_visitante=53,
        fase="FASE REGULAR",
    )
    db_session.add_all([p1, p2])
    await db_session.commit()

    res = client.get(f"/api/v1/equipos/{e1.id}?torneo_id={t.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["nombre"] == "SANTA YOFRE"
    assert data["pj"] == 2
    assert data["pg"] == 1
    assert data["pp"] == 1
    assert len(data["partidos_disputados"]) == 2

    partido_reciente = data["partidos_disputados"][0]
    assert partido_reciente["fase"] == "FASE REGULAR"
    assert partido_reciente["fecha_numero"] == 2
    assert partido_reciente["instancia"] == "Visitante"
    assert partido_reciente["dia"] == "08-08-2026"
    assert partido_reciente["versus"] == "FIRPO BLUNTS"
    assert partido_reciente["resultado"] == "P 71-53"
    assert partido_reciente["gano"] is False

    partido_anterior = data["partidos_disputados"][1]
    assert partido_anterior["fase"] == "FASE REGULAR"
    assert partido_anterior["fecha_numero"] == 1
    assert partido_anterior["instancia"] == "Local"
    assert partido_anterior["dia"] == "04-08-2026"
    assert partido_anterior["versus"] == "FIRPO BLUNTS"
    assert partido_anterior["resultado"] == "G 51-44"
    assert partido_anterior["gano"] is True

    assert len(data["torneos"]) >= 1
    assert data["torneos"][0]["etiqueta"] == "EDICIÓN 22 - TBL A - GRUPO 1"


