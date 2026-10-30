from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models import Equipo, Fecha, Partido


def normalizar_fase(fase: str | None) -> str:
    if not fase:
        return "FASE REGULAR"
    f = fase.strip().upper()
    if "PROMOCION" in f or "DESCENSO" in f:
        return "PROMOCIÓN"
    return fase


def formatear_partido(r, con_normalizacion: bool = False) -> dict:
    fase_val = normalizar_fase(r.fase) if con_normalizacion else r.fase
    return {
        "id": r.id,
        "fase": fase_val,
        "fecha_id": getattr(r, "fecha_id", None),
        "numero_fecha": r.numero_fecha,
        "fecha": str(r.fecha) if r.fecha else None,
        "horario": str(r.horario) if r.horario else None,
        "cancha": r.cancha,
        "equipo_local": r.equipo_local,
        "equipo_visitante": r.equipo_visitante,
        "escudo_local": r.escudo_local,
        "escudo_visitante": r.escudo_visitante,
        "pts_local": getattr(r, "pts_local", None),
        "pts_visitante": getattr(r, "pts_visitante", None),
        "equipo_local_id": r.equipo_local_id,
        "equipo_visitante_id": r.equipo_visitante_id,
    }


async def listar_partidos_con_equipos(
    db: AsyncSession,
    torneo_id: int | None = None,
    jugado: bool | None = None,
    limit: int | None = None,
    offset: int = 0,
    orden_asc: bool = False,
    con_normalizacion: bool = False,
) -> list[dict]:
    equipo_local = aliased(Equipo)
    equipo_visitante = aliased(Equipo)

    q = (
        select(
            Partido.id,
            Partido.fase,
            Partido.fecha_id,
            Fecha.numero.label("numero_fecha"),
            Fecha.fecha,
            Partido.horario,
            Partido.cancha,
            equipo_local.nombre.label("equipo_local"),
            equipo_visitante.nombre.label("equipo_visitante"),
            equipo_local.escudo_url.label("escudo_local"),
            equipo_visitante.escudo_url.label("escudo_visitante"),
            Partido.pts_local,
            Partido.pts_visitante,
            Partido.equipo_local_id,
            Partido.equipo_visitante_id,
        )
        .join(Fecha, Fecha.id == Partido.fecha_id)
        .join(equipo_local, equipo_local.id == Partido.equipo_local_id)
        .join(equipo_visitante, equipo_visitante.id == Partido.equipo_visitante_id)
    )

    if torneo_id is not None:
        q = q.where(Partido.torneo_id == torneo_id)
    if jugado is not None:
        q = q.where(Partido.jugado.is_(jugado))

    if orden_asc:
        q = q.order_by(Fecha.fecha.asc().nulls_last(), Partido.id.asc())
    else:
        q = q.order_by(Fecha.fecha.desc(), Partido.id.desc())

    if limit is not None:
        q = q.limit(limit)
    if offset > 0:
        q = q.offset(offset)

    rows = (await db.execute(q)).all()
    return [formatear_partido(r, con_normalizacion=con_normalizacion) for r in rows]
