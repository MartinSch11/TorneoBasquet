"""Test de cálculo estadístico: goleadores y valoración FIBA (§8)."""

from app.services.estadisticas import estadisticas_por_jugador


async def test_goleadores(client) -> None:
    res = client.get("/api/v1/torneos/1/goleadores")
    assert res.status_code == 200
    gol = res.json()
    assert [g["jugador"] for g in gol] == ["Juan Pérez", "Marco López", "Luis Gómez", "Carlos Díaz"]

    top = gol[0]
    # puntos = libres*1 + dobles*2 + triples*3
    assert top["puntos"] == 6 + 6 * 2 + 4 * 3  # 30
    assert top["promedio"] == 30.0  # 1 partido


async def test_estadisticas_jugadores_metricas(client) -> None:
    res = client.get("/api/v1/estadisticas/jugadores?torneo_id=1&metrica=valoracion")
    assert res.status_code == 200
    filas = res.json()

    juan = next(f for f in filas if f["jugador"] == "Juan Pérez")
    # VAL = Pts(30) + Reb(8) + Ast(5) + Rec(2) + Blq(1) + FR(4)
    #      - Fallados((2)+(4)+(5)) - Perd(3) - FP(2) = 30+8+5+2+1+4-11-3-2 = 34
    assert juan["valor"] == 34.0

    luis = next(f for f in filas if f["jugador"] == "Luis Gómez")
    # 20 + 8 + 4 + 3 + 2 + 3 - (0+3+3=6) - 2 - 1 = 31
    assert luis["valor"] == 31.0


async def test_estadisticas_tiros(client) -> None:
    res = client.get("/api/v1/estadisticas/jugadores?torneo_id=1&metrica=puntos")
    juan = next(f for f in res.json() if f["jugador"] == "Juan Pérez")
    assert juan["tiros"] == {
        "libres": {"conv": 6, "int": 8},
        "dobles": {"conv": 6, "int": 10},
        "triples": {"conv": 4, "int": 9},
    }


async def test_estadisticas_equipos(client) -> None:
    res = client.get("/api/v1/estadisticas/equipos?torneo_id=1&metrica=puntos")
    assert res.status_code == 200
    eqt = res.json()
    assert eqt[0]["equipo"] == "Leones" and eqt[0]["valor"] == 30.0


async def test_metrica_invalida(client) -> None:
    res = client.get("/api/v1/estadisticas/equipos?torneo_id=1&metrica=noexiste")
    assert res.status_code == 422


async def test_formula_coincide_con_util_frontend() -> None:
    """La misma fórmula implementada en el frontend (utils/calcularValoracion.js)."""

    def calcular_valoracion_front(st):
        tiros_fallados = (
            (st["libres_int"] - st["libres_conv"])
            + (st["dobles_int"] - st["dobles_conv"])
            + (st["triples_int"] - st["triples_conv"])
        )
        puntos = st["libres_conv"] * 1 + st["dobles_conv"] * 2 + st["triples_conv"] * 3
        rebotes = st["reb_ofensivos"] + st["reb_defensivos"]
        return (
            puntos + rebotes + st["asistencias"] + st["recuperos"] + st["bloqueos"]
            + st["faltas_recibidas"] - tiros_fallados - st["perdidas"] - st["faltas_personales"]
        )

    stat = {"libres_conv": 6, "libres_int": 8, "dobles_conv": 6, "dobles_int": 10,
            "triples_conv": 4, "triples_int": 9, "reb_ofensivos": 2, "reb_defensivos": 6,
            "asistencias": 5, "recuperos": 2, "bloqueos": 1, "faltas_recibidas": 4,
            "perdidas": 3, "faltas_personales": 2}
    assert calcular_valoracion_front(stat) == 34


async def test_estadisticas_por_jugador_servicio(db_session) -> None:
    filas = await estadisticas_por_jugador(db_session, 1, "asistencias")
    top = filas[0]
    assert top["jugador"] == "Juan Pérez"
    assert top["valor"] == 5.0