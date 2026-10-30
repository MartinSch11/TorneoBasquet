from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.deps import get_db, require_roles
from app.models import (
    Album,
    Equipo,
    EstadisticaPartido,
    Fecha,
    Jugador,
    Partido,
    Torneo,
)
from app.schemas.estadistica import EstadisticaIn, EstadisticasPartidoIn
from app.schemas.partido import (
    EstadisticaPartidoDetalleOut,
    PartidoCreateIn,
    PartidoResultadoIn,
    PartidoUpdateIn,
    ResultadoOut,
)

router = APIRouter()


async def _upsert_estadistica(db: AsyncSession, partido_id: int, stat: EstadisticaIn) -> None:
    result = await db.execute(
        select(EstadisticaPartido).where(
            EstadisticaPartido.partido_id == partido_id,
            EstadisticaPartido.jugador_id == stat.jugador_id,
        )
    )
    reg = result.scalar_one_or_none()
    if reg is None:
        reg = EstadisticaPartido(partido_id=partido_id, jugador_id=stat.jugador_id)

    reg.libres_conv = stat.libres_conv
    reg.libres_int = stat.libres_int
    reg.dobles_conv = stat.dobles_conv
    reg.dobles_int = stat.dobles_int
    reg.triples_conv = stat.triples_conv
    reg.triples_int = stat.triples_int
    reg.asistencias = stat.asistencias
    reg.reb_ofensivos = stat.reb_ofensivos
    reg.reb_defensivos = stat.reb_defensivos
    reg.faltas_personales = stat.faltas_personales
    reg.faltas_recibidas = stat.faltas_recibidas
    reg.faltas_tecnicas = stat.faltas_tecnicas
    reg.faltas_antideportivas = stat.faltas_antideportivas
    reg.perdidas = stat.perdidas
    reg.bloqueos = stat.bloqueos
    reg.recuperos = stat.recuperos
    db.add(reg)


@router.post("/partidos/{partido_id}/resultado")
async def cargar_resultado(
    partido_id: int,
    body: PartidoResultadoIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    partido = await db.get(Partido, partido_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    partido.pts_local = body.pts_local
    partido.pts_visitante = body.pts_visitante
    partido.jugado = True
    await db.commit()
    return {"id": partido.id, "pts_local": body.pts_local, "pts_visitante": body.pts_visitante}


@router.post("/partidos/{partido_id}/estadisticas")
async def cargar_estadisticas(
    partido_id: int,
    body: EstadisticasPartidoIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    partido = await db.get(Partido, partido_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    for stat in body.estadisticas:
        await _upsert_estadistica(db, partido_id, stat)
    await db.commit()
    return {"partido_id": partido_id, "jugadores": len(body.estadisticas)}


@router.get("/partidos/{partido_id}", response_model=ResultadoOut)
async def obtener_partido_detalle(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    equipo_local = aliased(Equipo)
    equipo_visitante = aliased(Equipo)
    q = (
        select(
            Partido.id,
            Partido.fase,
            Partido.fecha_id,
            Partido.jugado,
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
            Torneo.nombre.label("torneo_nombre"),
            Torneo.categoria.label("categoria"),
        )
        .join(Fecha, Fecha.id == Partido.fecha_id)
        .join(Torneo, Torneo.id == Partido.torneo_id)
        .join(equipo_local, equipo_local.id == Partido.equipo_local_id)
        .join(equipo_visitante, equipo_visitante.id == Partido.equipo_visitante_id)
        .where(Partido.id == partido_id)
    )
    r = (await db.execute(q)).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return {
        "id": r.id,
        "fase": r.fase,
        "fecha_id": r.fecha_id,
        "jugado": r.jugado,
        "numero_fecha": r.numero_fecha,
        "fecha": str(r.fecha) if r.fecha else None,
        "horario": str(r.horario) if r.horario else None,
        "cancha": r.cancha,
        "equipo_local": r.equipo_local,
        "equipo_visitante": r.equipo_visitante,
        "escudo_local": r.escudo_local,
        "escudo_visitante": r.escudo_visitante,
        "pts_local": r.pts_local,
        "pts_visitante": r.pts_visitante,
        "equipo_local_id": r.equipo_local_id,
        "equipo_visitante_id": r.equipo_visitante_id,
        "torneo_nombre": r.torneo_nombre,
        "categoria": r.categoria,
    }


@router.get("/partidos/{partido_id}/estadisticas", response_model=list[EstadisticaPartidoDetalleOut])
async def obtener_estadisticas_partido(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    partido = await db.get(Partido, partido_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    result = await db.execute(
        select(EstadisticaPartido, Jugador)
        .join(Jugador, Jugador.id == EstadisticaPartido.jugador_id)
        .where(EstadisticaPartido.partido_id == partido_id)
    )
    rows = result.all()
    return [
        {
            "jugador_id": ep.jugador_id,
            "jugador_nombre": f"{j.nombre} {j.apellido}".strip(),
            "numero": j.numero,
            "equipo_id": j.equipo_id,
            "libres_conv": ep.libres_conv,
            "libres_int": ep.libres_int,
            "dobles_conv": ep.dobles_conv,
            "dobles_int": ep.dobles_int,
            "triples_conv": ep.triples_conv,
            "triples_int": ep.triples_int,
            "asistencias": ep.asistencias,
            "reb_ofensivos": ep.reb_ofensivos,
            "reb_defensivos": ep.reb_defensivos,
            "faltas_personales": ep.faltas_personales,
            "faltas_recibidas": ep.faltas_recibidas,
            "faltas_tecnicas": ep.faltas_tecnicas,
            "faltas_antideportivas": ep.faltas_antideportivas,
            "perdidas": ep.perdidas,
            "bloqueos": ep.bloqueos,
            "recuperos": ep.recuperos,
            "puntos": ep.libres_conv + ep.dobles_conv * 2 + ep.triples_conv * 3,
        }
        for ep, j in rows
    ]


@router.post("/partidos", status_code=status.HTTP_201_CREATED)
async def crear_partido(
    body: PartidoCreateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    torneo = await db.get(Torneo, body.torneo_id)
    if torneo is None:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    if torneo.estado == "inactivo":
        raise HTTPException(status_code=400, detail="No se puede programar partidos en un torneo inactivo")
    if torneo.estado == "finalizado":
        raise HTTPException(status_code=400, detail="No se puede programar partidos en un torneo finalizado")

    if body.equipo_local_id == body.equipo_visitante_id:
        raise HTTPException(status_code=400, detail="El equipo local y el visitante deben ser distintos")

    local = await db.get(Equipo, body.equipo_local_id)
    visit = await db.get(Equipo, body.equipo_visitante_id)
    if not local or not visit:
        raise HTTPException(status_code=404, detail="Uno o ambos equipos no existen")

    if not local.activo or not visit.activo:
        raise HTTPException(status_code=400, detail="No se puede programar partidos con equipos dados de baja")

    fecha = (
        await db.execute(
            select(Fecha).where(
                Fecha.torneo_id == body.torneo_id,
                Fecha.numero == body.fecha_numero,
            )
        )
    ).scalar_one_or_none()

    if fecha is None:
        fecha = Fecha(
            torneo_id=body.torneo_id,
            numero=body.fecha_numero,
            descripcion=f"Fecha {body.fecha_numero}",
            fecha=body.fecha_dia,
        )
        db.add(fecha)
        await db.flush()
    elif body.fecha_dia:
        fecha.fecha = body.fecha_dia
        await db.flush()

    partido_duplicado = (
        await db.execute(
            select(Partido).where(
                Partido.torneo_id == body.torneo_id,
                Partido.fecha_id == fecha.id,
                Partido.equipo_local_id == body.equipo_local_id,
                Partido.equipo_visitante_id == body.equipo_visitante_id,
            )
        )
    ).scalar_one_or_none()
    if partido_duplicado:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un partido programado entre estos dos equipos en esta misma fecha.",
        )

    partido = Partido(
        fecha_id=fecha.id,
        torneo_id=body.torneo_id,
        equipo_local_id=body.equipo_local_id,
        equipo_visitante_id=body.equipo_visitante_id,
        fase=body.fase or "FASE REGULAR",
        horario=body.horario,
        cancha=body.cancha,
        jugado=False,
    )
    db.add(partido)
    await db.commit()
    await db.refresh(partido)
    return {"id": partido.id, "mensaje": "Partido programado correctamente"}


@router.patch("/partidos/{partido_id}")
async def actualizar_partido(
    partido_id: int,
    body: PartidoUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    partido = await db.get(Partido, partido_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    local_id = body.equipo_local_id if body.equipo_local_id is not None else partido.equipo_local_id
    visit_id = body.equipo_visitante_id if body.equipo_visitante_id is not None else partido.equipo_visitante_id
    if local_id == visit_id:
        raise HTTPException(status_code=400, detail="El equipo local y el visitante deben ser distintos")

    if body.equipo_local_id is not None:
        loc = await db.get(Equipo, body.equipo_local_id)
        if not loc or not loc.activo:
            raise HTTPException(status_code=400, detail="Equipo local no encontrado o inactivo")
        partido.equipo_local_id = body.equipo_local_id

    if body.equipo_visitante_id is not None:
        vis = await db.get(Equipo, body.equipo_visitante_id)
        if not vis or not vis.activo:
            raise HTTPException(status_code=400, detail="Equipo visitante no encontrado o inactivo")
        partido.equipo_visitante_id = body.equipo_visitante_id

    if body.fecha_numero is not None:
        fecha = (
            await db.execute(
                select(Fecha).where(
                    Fecha.torneo_id == partido.torneo_id,
                    Fecha.numero == body.fecha_numero,
                )
            )
        ).scalar_one_or_none()
        if fecha is None:
            fecha = Fecha(
                torneo_id=partido.torneo_id,
                numero=body.fecha_numero,
                descripcion=f"Fecha {body.fecha_numero}",
                fecha=body.fecha_dia,
            )
            db.add(fecha)
            await db.flush()
        elif body.fecha_dia is not None:
            fecha.fecha = body.fecha_dia
            await db.flush()
        partido.fecha_id = fecha.id
    elif body.fecha_dia is not None:
        fecha = await db.get(Fecha, partido.fecha_id)
        if fecha:
            fecha.fecha = body.fecha_dia
            await db.flush()

    if body.horario is not None:
        partido.horario = body.horario
    if body.cancha is not None:
        partido.cancha = body.cancha
    if body.fase is not None:
        partido.fase = body.fase

    if body.jugado is False:
        partido.jugado = False
        partido.pts_local = None
        partido.pts_visitante = None
        await db.execute(
            delete(EstadisticaPartido).where(EstadisticaPartido.partido_id == partido_id)
        )

    await db.commit()
    await db.refresh(partido)
    return {"id": partido.id, "mensaje": "Partido actualizado correctamente"}


@router.delete("/partidos/{partido_id}")
async def eliminar_partido(
    partido_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    partido = await db.get(Partido, partido_id)
    if partido is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    await db.execute(
        update(Album).where(Album.partido_id == partido_id).values(partido_id=None)
    )
    await db.execute(
        delete(EstadisticaPartido).where(EstadisticaPartido.partido_id == partido_id)
    )
    await db.delete(partido)
    await db.commit()
    return {"mensaje": "Partido eliminado correctamente"}
