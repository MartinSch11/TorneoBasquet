"""Test del cálculo de tabla de posiciones (reglas §8)."""

import pytest

from app.models import Equipo, Fecha, Inscripcion, Partido
from app.services.posiciones import calcular_posiciones


INK = {"torneo_id": 1}


async def test_posiciones_endpoint(client) -> None:
    res = client.get("/api/v1/torneos/1/posiciones")
    assert res.status_code == 200
    pos = res.json()
    assert len(pos) == 4

    # puntos: victoria = 2, derrota = 1
    for p in pos:
        assert p["puntos"] == p["pg"] * 2 + p["pp"] * 1

    # porcentaje = PG / PJ * 100
    for p in pos:
        assert p["porcentaje"] == round(p["pg"] / p["pj"] * 100, 2)

    orden = [p["equipo"] for p in pos]
    assert orden == ["Cóndores", "Leones", "Tigres", "Águilas"], orden

    condores = pos[0]
    assert (condores["pj"], condores["pg"], condores["pp"], condores["puntos"]) == (1, 1, 0, 2)


async def test_posiciones_torneo_inexistente(client) -> None:
    res = client.get("/api/v1/torneos/999/posiciones")
    assert res.status_code == 404


async def test_desempate_por_resultado_directo(db_session) -> None:
    """Empate en puntos: decide la diferencia en los enfrentamientos entre sí."""
    e1 = Equipo(nombre="Zeta")
    e2 = Equipo(nombre="Beta")
    db_session.add_all([e1, e2])
    await db_session.flush()
    for eq in (e1, e2):
        db_session.add(Inscripcion(**INK, equipo_id=eq.id))

    f = Fecha(torneo_id=1, numero=99)
    db_session.add(f)
    await db_session.flush()

    # Una victoria para cada uno: Zeta x+5, Beta x+3 -> empate en puntos (2 y 2)
    db_session.add(Partido(fecha_id=f.id, torneo_id=1, equipo_local_id=e1.id,
                           equipo_visitante_id=e2.id, pts_local=80, pts_visitante=75, jugado=True))
    db_session.add(Partido(fecha_id=f.id, torneo_id=1, equipo_local_id=e2.id,
                           equipo_visitante_id=e1.id, pts_local=60, pts_visitante=58, jugado=True))
    await db_session.commit()

    pos = await calcular_posiciones(db_session, 1)
    zeta = next(p for p in pos if p.equipo == "Zeta")
    beta = next(p for p in pos if p.equipo == "Beta")
    assert zeta.puntos == beta.puntos == 3

    # diferencia en partidos entre sí: Zeta +3 y Beta -3 -> Zeta primero
    indices = {p.equipo: i for i, p in enumerate(pos)}
    assert indices["Zeta"] < indices["Beta"]

    await db_session.rollback()


async def test_desempate_triple_empate_round_robin(db_session) -> None:
    """Tres equipos a 3 puntos cada uno (piedra-papel-tijera): decide la diferencia entre sí."""
    a, b, c = (Equipo(nombre=x) for x in ("Alfa", "Bravo", "Charlie"))
    db_session.add_all([a, b, c])
    await db_session.flush()
    for eq in (a, b, c):
        db_session.add(Inscripcion(**INK, equipo_id=eq.id))
    f = Fecha(torneo_id=1, numero=98)
    db_session.add(f)
    await db_session.flush()

    pares = [
        (a, b, 75, 70),  # A +5
        (c, a, 74, 71),  # C +3 (A -3)
        (b, c, 60, 58),  # B +2 (C -2)
    ]
    for local, visit, pl, pv in pares:
        db_session.add(Partido(fecha_id=f.id, torneo_id=1, equipo_local_id=local.id,
                               equipo_visitante_id=visit.id, pts_local=pl, pts_visitante=pv,
                               jugado=True))
    await db_session.commit()

    pos = await calcular_posiciones(db_session, 1)
    grupo = [p for p in pos if p.equipo in ("Alfa", "Bravo", "Charlie")]
    assert all(p.puntos == 3 for p in grupo)
    orden = [p.equipo for p in grupo]
    # dif entre sí: Alfa +2, Bravo -1(?), Charlie -1 -> Alfa primero; Bravo/Charlie con dif -1:
    #   Bravo: -3 +2 = -1 ; Charlie: +3 -2 = +1 -> Charlie segundo
    assert orden == ["Alfa", "Charlie", "Bravo"], orden

    await db_session.rollback()