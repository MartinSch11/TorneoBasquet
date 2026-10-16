from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Equipo, EstadisticaPartido, Inscripcion, Jugador, Partido


# ---------------------------------------------------------------------------
# Expresiones de cálculo
# ---------------------------------------------------------------------------


def _pts_expr():
    """Puntos totales = libres_conv + dobles_conv*2 + triples_conv*3"""
    return (
        EstadisticaPartido.libres_conv
        + EstadisticaPartido.dobles_conv * 2
        + EstadisticaPartido.triples_conv * 3
    )


def _rebotes_expr():
    return EstadisticaPartido.reb_ofensivos + EstadisticaPartido.reb_defensivos


def _efectividad_expr():
    conversion = (
        EstadisticaPartido.libres_conv
        + EstadisticaPartido.dobles_conv
        + EstadisticaPartido.triples_conv
    )
    intentos = (
        EstadisticaPartido.libres_int
        + EstadisticaPartido.dobles_int
        + EstadisticaPartido.triples_int
    )
    return case((intentos > 0, conversion * 100.0 / intentos), else_=0.0)


def _faltas_totales_expr():
    return (
        EstadisticaPartido.faltas_personales
        + EstadisticaPartido.faltas_tecnicas
        + EstadisticaPartido.faltas_antideportivas
    )


def _valoracion_expr():
    """VAL = Pts + Reb + As + Rec + Bl + Faltas_Recibidas
    - Tiros_Fallados - Perdidas - Faltas_Personales"""
    tiros_fallados = (
        (EstadisticaPartido.libres_int - EstadisticaPartido.libres_conv)
        + (EstadisticaPartido.dobles_int - EstadisticaPartido.dobles_conv)
        + (EstadisticaPartido.triples_int - EstadisticaPartido.triples_conv)
    )
    return (
        _pts_expr()
        + _rebotes_expr()
        + EstadisticaPartido.asistencias
        + EstadisticaPartido.recuperos
        + EstadisticaPartido.bloqueos
        + EstadisticaPartido.faltas_recibidas
        - tiros_fallados
        - EstadisticaPartido.perdidas
        - EstadisticaPartido.faltas_personales
    )


def _col(expr):
    return func.coalesce(func.sum(expr), 0)


class StatsSum:
    """Columnas agregadas (SUM) reutilizadas por las consultas."""

    libres_conv = _col(EstadisticaPartido.libres_conv)
    libres_int = _col(EstadisticaPartido.libres_int)
    dobles_conv = _col(EstadisticaPartido.dobles_conv)
    dobles_int = _col(EstadisticaPartido.dobles_int)
    triples_conv = _col(EstadisticaPartido.triples_conv)
    triples_int = _col(EstadisticaPartido.triples_int)
    asistencias = _col(EstadisticaPartido.asistencias)
    reb_ofensivos = _col(EstadisticaPartido.reb_ofensivos)
    reb_defensivos = _col(EstadisticaPartido.reb_defensivos)
    faltas_personales = _col(EstadisticaPartido.faltas_personales)
    faltas_recibidas = _col(EstadisticaPartido.faltas_recibidas)
    faltas_tecnicas = _col(EstadisticaPartido.faltas_tecnicas)
    faltas_antideportivas = _col(EstadisticaPartido.faltas_antideportivas)
    perdidas = _col(EstadisticaPartido.perdidas)
    bloqueos = _col(EstadisticaPartido.bloqueos)
    recuperos = _col(EstadisticaPartido.recuperos)
    puntos = _col(_pts_expr())
    rebotes = _col(_rebotes_expr())
    efectividad = _col(_efectividad_expr())
    faltas_totales = _col(_faltas_totales_expr())
    valoracion = _col(_valoracion_expr())


METRICAS_EQUIPO = {
    "puntos": {"clave": "puntos", "etiqueta": "Puntos"},
    "efectividad": {"clave": "efectividad", "etiqueta": "Efectividad"},
    "asistencias": {"clave": "asistencias", "etiqueta": "Asistencias"},
    "rebotes": {"clave": "rebotes", "etiqueta": "Rebotes"},
    "recuperos": {"clave": "recuperos", "etiqueta": "Recuperos"},
    "perdidas": {"clave": "perdidas", "etiqueta": "Perdidas"},
    "faltas": {"clave": "faltas_totales", "etiqueta": "Faltas"},
    "bloqueos": {"clave": "bloqueos", "etiqueta": "Bloqueos"},
    "valoracion": {"clave": "valoracion", "etiqueta": "Valoración"},
}


def _filtro_est() -> tuple:
    """Joins base desde estadistica -> partido -> jugador -> equipo."""
    joins = (
        (Partido, Partido.id == EstadisticaPartido.partido_id),
        (Jugador, Jugador.id == EstadisticaPartido.jugador_id),
        (Equipo, Equipo.id == Jugador.equipo_id),
    )
    where = [Partido.jugado.is_(True)]
    return joins, where


def _select_con_joins(query, joins):
    q = query.select_from(EstadisticaPartido)
    for target, onclause in joins:
        q = q.join(target, onclause)
    return q


def _boxscore(r) -> dict:
    """Deriva el boxscore completo a partir de una fila agrupada."""
    libres = {"conv": int(r.libres_conv or 0), "int": int(r.libres_int or 0)}
    dobles = {"conv": int(r.dobles_conv or 0), "int": int(r.dobles_int or 0)}
    triples = {"conv": int(r.triples_conv or 0), "int": int(r.triples_int or 0)}
    conversion = libres["conv"] + dobles["conv"] + triples["conv"]
    intentos = libres["int"] + dobles["int"] + triples["int"]
    fp = int(r.faltas_personales or 0)
    fr = int(r.faltas_recibidas or 0)
    ft = int(r.faltas_tecnicas or 0)
    fa = int(r.faltas_antideportivas or 0)
    return {
        "tiros": {"libres": libres, "dobles": dobles, "triples": triples},
        "puntos": libres["conv"] + dobles["conv"] * 2 + triples["conv"] * 3,
        "efectividad": round(conversion * 100.0 / intentos, 2) if intentos else 0.0,
        "asistencias": int(r.asistencias or 0),
        "ro": int(r.reb_ofensivos or 0),
        "rd": int(r.reb_defensivos or 0),
        "rebotes": int(r.reb_ofensivos or 0) + int(r.reb_defensivos or 0),
        "recuperos": int(r.recuperos or 0),
        "perdidas": int(r.perdidas or 0),
        "faltas_personales": fp,
        "faltas_recibidas": fr,
        "faltas_tecnicas": ft,
        "faltas_antideportivas": fa,
        "faltas_totales": fp + ft + fa,
        "bloqueos": int(r.bloqueos or 0),
        "valoracion": float(r.valoracion or 0),
    }


def _boxscore_cero() -> dict:
    fila = type("R", (), {c: None for c in _boxscore_cols()})()
    return _boxscore(fila)


def _boxscore_cols() -> list[str]:
    return [
        "libres_conv", "libres_int", "dobles_conv", "dobles_int", "triples_conv",
        "triples_int", "asistencias", "reb_ofensivos", "reb_defensivos", "faltas_personales",
        "faltas_recibidas", "faltas_tecnicas", "faltas_antideportivas", "perdidas",
        "bloqueos", "recuperos", "valoracion",
    ]


def _valor_metrica(row: dict, metrica: str) -> float:
    """Valor numérico de la métrica seleccionada, para ordenar la tabla."""
    if metrica == "puntos":
        return float(row.get("puntos") or 0)
    if metrica == "efectividad":
        return float(row.get("efectividad") or 0)
    if metrica == "asistencias":
        return float(row.get("asistencias") or 0)
    if metrica == "rebotes":
        return float(row.get("rebotes") or 0)
    if metrica == "recuperos":
        return float(row.get("recuperos") or 0)
    if metrica == "perdidas":
        return float(row.get("perdidas") or 0)
    if metrica == "faltas":
        return float(row.get("faltas_totales") or 0)
    if metrica == "bloqueos":
        return float(row.get("bloqueos") or 0)
    if metrica == "valoracion":
        return float(row.get("valoracion") or 0)
    return 0.0


# ---------------------------------------------------------------------------
# Equipos
# ---------------------------------------------------------------------------


async def _sums_por_equipo(db: AsyncSession, torneo_id: int) -> dict[int, object]:
    joins, where = _filtro_est()
    where.append(Partido.torneo_id == torneo_id)

    cols = [
        (c, getattr(StatsSum, c).label(c))
        for c in _boxscore_cols()
    ]

    query = select(Equipo.id.label("equipo_id"), *[c for _, c in cols]).where(*where)
    query = _select_con_joins(query, joins).group_by(Equipo.id)

    rows = (await db.execute(query)).all()
    return {r.equipo_id: r for r in rows}


async def _partidos_por_equipo(db: AsyncSession, torneo_id: int) -> dict[int, dict]:
    """PJ, PC (a favor) y PR (en contra) por equipo desde los resultados."""
    query = (
        select(
            Inscripcion.equipo_id.label("equipo_id"),
            func.count(func.distinct(Partido.id)).label("pj"),
            func.coalesce(
                func.sum(
                    case(
                        (Partido.equipo_local_id == Inscripcion.equipo_id, Partido.pts_local),
                        else_=Partido.pts_visitante,
                    )
                ),
                0,
            ).label("pc"),
            func.coalesce(
                func.sum(
                    case(
                        (Partido.equipo_local_id == Inscripcion.equipo_id, Partido.pts_visitante),
                        else_=Partido.pts_local,
                    )
                ),
                0,
            ).label("pr"),
        )
        .select_from(Inscripcion)
        .join(
            Partido,
            (Partido.torneo_id == torneo_id)
            & (
                (Partido.equipo_local_id == Inscripcion.equipo_id)
                | (Partido.equipo_visitante_id == Inscripcion.equipo_id)
            )
            & Partido.jugado.is_(True),
        )
        .where(Inscripcion.torneo_id == torneo_id)
        .group_by(Inscripcion.equipo_id)
    )
    rows = (await db.execute(query)).all()
    return {
        r.equipo_id: {"pj": int(r.pj or 0), "pc": int(r.pc or 0), "pr": int(r.pr or 0)}
        for r in rows
    }


async def estadisticas_por_equipo(db: AsyncSession, torneo_id: int, metrica: str) -> list[dict]:
    stats = await _sums_por_equipo(db, torneo_id)
    partidos = await _partidos_por_equipo(db, torneo_id)

    equipos_row = await db.execute(
        select(Equipo)
        .join(Inscripcion, Inscripcion.equipo_id == Equipo.id)
        .where(Inscripcion.torneo_id == torneo_id)
    )
    equipos = equipos_row.scalars().all()

    result = []
    for eq in equipos:
        base = partidos.get(eq.id, {"pj": 0, "pc": 0, "pr": 0})
        fila_stats = stats.get(eq.id)
        box = _boxscore_cero() if fila_stats is None else _boxscore(fila_stats)
        row = {
            "equipo_id": eq.id,
            "equipo": eq.nombre,
            "escudo_url": eq.escudo_url,
            "pj": base["pj"],
            "pc": base["pc"],
            "pr": base["pr"],
            "dif": base["pc"] - base["pr"],
            **box,
        }
        row["valor"] = _valor_metrica(row, metrica)
        result.append(row)

    result.sort(key=lambda r: r["valor"], reverse=True)
    return result


# ---------------------------------------------------------------------------
# Jugadores
# ---------------------------------------------------------------------------


async def _sums_por_jugador(db: AsyncSession, torneo_id: int) -> list[object]:
    joins, where = _filtro_est()
    where.append(Partido.torneo_id == torneo_id)
    where.append(Jugador.activo.is_(True))

    cols = [
        (c, getattr(StatsSum, c).label(c))
        for c in _boxscore_cols()
    ]

    query = select(
        Jugador.id.label("jugador_id"),
        func.concat(Jugador.nombre, " ", Jugador.apellido).label("jugador"),
        Equipo.nombre.label("equipo"),
        Equipo.escudo_url.label("escudo_url"),
        func.count(func.distinct(Partido.id)).label("pj"),
        *[c for _, c in cols],
    ).where(*where)
    query = _select_con_joins(query, joins).group_by(Jugador.id, Equipo.nombre, Equipo.escudo_url)

    return (await db.execute(query)).all()


async def estadisticas_por_jugador(db: AsyncSession, torneo_id: int, metrica: str) -> list[dict]:
    rows = await _sums_por_jugador(db, torneo_id)

    result = []
    for r in rows:
        pj = int(r.pj or 0)
        box = _boxscore(r)
        row = {
            "jugador_id": r.jugador_id,
            "jugador": r.jugador,
            "equipo": r.equipo,
            "escudo_url": getattr(r, "escudo_url", None),
            "pj": pj,
            "promedio": round(box["puntos"] / pj, 2) if pj else 0.0,
            **box,
        }
        row["valor"] = _valor_metrica(row, metrica)
        result.append(row)

    result.sort(key=lambda r: r["valor"], reverse=True)
    return result
