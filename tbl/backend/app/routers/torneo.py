import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.core.deps import get_db, require_roles
from app.models import (
    Album,
    Equipo,
    EstadisticaPartido,
    Fecha,
    Inscripcion,
    Jugador,
    Partido,
    Torneo,
)
from app.schemas.estadistica import EstadisticaIn, EstadisticasPartidoIn
from app.schemas.partido import PartidoResultadoIn
from app.schemas.torneo import (
    EquipoCreateIn,
    EquipoFichaOut,
    EquipoListOut,
    EquipoUpdateIn,
    EstadisticaPartidoDetalleOut,
    GoleadorOut,
    InscripcionIn,
    JugadorCreateIn,
    JugadorUpdateIn,
    PartidoCreateIn,
    PartidoUpdateIn,
    PosicionOut,
    ProximoPartidoOut,
    ResultadoOut,
    TorneoCreateIn,
    TorneoOut,
    TorneoUpdateIn,
)
from app.services.estadisticas import estadisticas_por_jugador
from app.services.posiciones import calcular_posiciones

router = APIRouter()


@router.get("/torneos", response_model=list[TorneoOut])
async def listar_torneos(
    db: AsyncSession = Depends(get_db),
    activos: bool = False,
    todos: bool = False,
) -> list[Torneo]:
    query = select(Torneo).order_by(Torneo.temporada.desc(), Torneo.categoria)
    if not todos:
        query = query.where(Torneo.estado != "inactivo")
    if activos:
        query = query.where(Torneo.estado == "activo")
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/torneos", response_model=TorneoOut, status_code=status.HTTP_201_CREATED)
async def crear_torneo(
    body: TorneoCreateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> Torneo:
    torneo = Torneo(
        nombre=body.nombre.strip(),
        edicion=body.edicion,
        categoria=body.categoria.strip(),
        grupo=body.grupo.strip() if body.grupo else None,
        temporada=body.temporada.strip(),
        estado=body.estado,
    )
    db.add(torneo)
    await db.commit()
    await db.refresh(torneo)
    return torneo


@router.patch("/torneos/{torneo_id}", response_model=TorneoOut)
async def actualizar_torneo(
    torneo_id: int,
    body: TorneoUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> Torneo:
    torneo = await _get_torneo(db, torneo_id)
    if body.nombre is not None:
        torneo.nombre = body.nombre.strip()
    if body.edicion is not None:
        torneo.edicion = body.edicion
    if body.categoria is not None:
        torneo.categoria = body.categoria.strip()
    if body.grupo is not None:
        torneo.grupo = body.grupo.strip() if body.grupo else None
    if body.temporada is not None:
        torneo.temporada = body.temporada.strip()
    if body.estado is not None:
        torneo.estado = body.estado
    await db.commit()
    await db.refresh(torneo)
    return torneo


@router.delete("/torneos/{torneo_id}")
async def eliminar_torneo(
    torneo_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    torneo = await db.get(Torneo, torneo_id)
    if torneo is None:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    torneo.estado = "inactivo"
    await db.commit()
    return {"mensaje": "Torneo marcado como inactivo"}


async def _get_torneo(db: AsyncSession, torneo_id: int) -> Torneo:
    torneo = await db.get(Torneo, torneo_id)
    if torneo is None:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return torneo


@router.get("/torneos/{torneo_id}/posiciones", response_model=list[PosicionOut])
async def posiciones(torneo_id: int, db: AsyncSession = Depends(get_db)) -> list[dict]:
    await _get_torneo(db, torneo_id)
    lista = await calcular_posiciones(db, torneo_id)
    return [
        {
            "posicion": i + 1,
            "equipo_id": p.equipo_id,
            "equipo": p.equipo,
            "escudo_url": p.escudo_url,
            "pj": p.pj,
            "pg": p.pg,
            "pp": p.pp,
            "puntos_favor": p.puntos_favor,
            "puntos_contra": p.puntos_contra,
            "dgo": p.dgo,
            "porcentaje": p.porcentaje,
            "puntos": p.puntos,
        }
        for i, p in enumerate(lista)
    ]


@router.get("/torneos/{torneo_id}/resultados", response_model=list[ResultadoOut])
async def resultados(
    torneo_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    await _get_torneo(db, torneo_id)
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
        .where(Partido.torneo_id == torneo_id, Partido.jugado.is_(True))
        .order_by(Fecha.fecha.desc(), Partido.id.desc())
        .limit(limit)
        .offset((page - 1) * limit)
    )
    rows = (await db.execute(q)).all()
    return [
        {
            "id": r.id,
            "fase": r.fase,
            "fecha_id": r.fecha_id,
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
        }
        for r in rows
    ]


@router.get("/torneos/{torneo_id}/proximos-partidos", response_model=list[ProximoPartidoOut])
async def proximos_partidos(torneo_id: int, db: AsyncSession = Depends(get_db)) -> list[dict]:
    await _get_torneo(db, torneo_id)
    equipo_local = aliased(Equipo)
    equipo_visitante = aliased(Equipo)
    q = (
        select(
            Partido.id,
            Partido.fase,
            Fecha.numero.label("numero_fecha"),
            Fecha.fecha,
            Partido.horario,
            Partido.cancha,
            equipo_local.nombre.label("equipo_local"),
            equipo_visitante.nombre.label("equipo_visitante"),
            equipo_local.escudo_url.label("escudo_local"),
            equipo_visitante.escudo_url.label("escudo_visitante"),
            Partido.equipo_local_id,
            Partido.equipo_visitante_id,
        )
        .join(Fecha, Fecha.id == Partido.fecha_id)
        .join(equipo_local, equipo_local.id == Partido.equipo_local_id)
        .join(equipo_visitante, equipo_visitante.id == Partido.equipo_visitante_id)
        .where(Partido.torneo_id == torneo_id, Partido.jugado.is_(False))
        .order_by(Fecha.fecha.asc().nulls_last(), Partido.id.asc())
    )
    rows = (await db.execute(q)).all()
    return [
        {
            "id": r.id,
            "fase": r.fase,
            "numero_fecha": r.numero_fecha,
            "fecha": str(r.fecha) if r.fecha else None,
            "horario": str(r.horario) if r.horario else None,
            "cancha": r.cancha,
            "equipo_local": r.equipo_local,
            "equipo_visitante": r.equipo_visitante,
            "escudo_local": r.escudo_local,
            "escudo_visitante": r.escudo_visitante,
            "equipo_local_id": r.equipo_local_id,
            "equipo_visitante_id": r.equipo_visitante_id,
        }
        for r in rows
    ]


@router.get("/torneos/{torneo_id}/goleadores", response_model=list[GoleadorOut])
async def goleadores(torneo_id: int, db: AsyncSession = Depends(get_db)) -> list[dict]:
    await _get_torneo(db, torneo_id)
    rows = await estadisticas_por_jugador(db, torneo_id, metrica="puntos")
    return [
        {
            "jugador_id": r["jugador_id"],
            "jugador": r["jugador"],
            "equipo": r["equipo"],
            "escudo_url": r.get("escudo_url"),
            "pj": r["pj"],
            "puntos": r["puntos"],
            "promedio": r["promedio"],
        }
        for r in rows
    ]


@router.get("/equipos", response_model=list[EquipoListOut])
async def listar_equipos(
    db: AsyncSession = Depends(get_db),
    torneo_id: int | None = None,
    todos: bool = False,
) -> list[dict]:
    query = select(Equipo).options(
        selectinload(Equipo.inscripciones).selectinload(Inscripcion.torneo)
    )
    if torneo_id is not None:
        query = query.join(Inscripcion, Inscripcion.equipo_id == Equipo.id).where(
            Inscripcion.torneo_id == torneo_id
        )
    if not todos:
        query = query.where(Equipo.activo.is_(True))
    query = query.order_by(Equipo.nombre)
    result = await db.execute(query)
    equipos = result.scalars().all()

    salida = []
    for eq in equipos:
        t = eq.inscripciones[0].torneo if eq.inscripciones else None
        salida.append(
            {
                "id": eq.id,
                "nombre": eq.nombre,
                "escudo_url": eq.escudo_url,
                "activo": eq.activo,
                "torneo_id": t.id if t else None,
                "torneo_nombre": t.nombre if t else None,
                "categoria": t.categoria if t else None,
            }
        )
    return salida


@router.get("/equipos/{equipo_id}", response_model=EquipoFichaOut)
async def ficha_equipo(
    equipo_id: int,
    torneo_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    equipo = await db.get(Equipo, equipo_id)
    if equipo is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    partidos_q = select(Partido).where(
        (Partido.equipo_local_id == equipo_id) | (Partido.equipo_visitante_id == equipo_id),
        Partido.jugado.is_(True),
    )
    if torneo_id is not None:
        partidos_q = partidos_q.where(Partido.torneo_id == torneo_id)
    partidos = list((await db.execute(partidos_q)).scalars().all())

    pj = len(partidos)
    pg = pp = 0
    for p in partidos:
        puntos_local = p.pts_local or 0
        puntos_visit = p.pts_visitante or 0
        es_local = p.equipo_local_id == equipo_id
        if es_local and puntos_local > puntos_visit:
            pg += 1
        elif not es_local and puntos_visit > puntos_local:
            pg += 1
        else:
            pp += 1

    plantel = await db.execute(
        select(Jugador)
        .where(Jugador.equipo_id == equipo_id, Jugador.activo.is_(True))
        .order_by(Jugador.apellido)
    )
    jugadores = plantel.scalars().all()
    return {
        "id": equipo.id,
        "nombre": equipo.nombre,
        "escudo_url": equipo.escudo_url,
        "activo": equipo.activo,
        "pj": pj,
        "pg": pg,
        "pp": pp,
        "jugadores": [
            {
                "id": j.id,
                "nombre": f"{j.nombre} {j.apellido}".strip(),
                "nombre_pila": j.nombre,
                "apellido": j.apellido,
                "numero": j.numero,
                "foto_url": j.foto_url,
            }
            for j in jugadores
        ],
    }


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


@router.post("/torneos/{torneo_id}/equipos", status_code=status.HTTP_201_CREATED)
async def inscribir_equipo_torneo(
    torneo_id: int,
    body: InscripcionIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    torneo = await _get_torneo(db, torneo_id)
    equipo = await db.get(Equipo, body.equipo_id)
    if not equipo or not equipo.activo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado o inactivo")

    existente = (
        await db.execute(
            select(Inscripcion).where(
                Inscripcion.torneo_id == torneo_id,
                Inscripcion.equipo_id == body.equipo_id,
            )
        )
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(status_code=400, detail="El equipo ya está inscripto en este torneo")

    db.add(Inscripcion(torneo_id=torneo_id, equipo_id=body.equipo_id))
    await db.commit()
    return {"mensaje": f"Equipo '{equipo.nombre}' inscripto exitosamente en '{torneo.nombre}'"}


@router.delete("/torneos/{torneo_id}/equipos/{equipo_id}")
async def desinscribir_equipo_torneo(
    torneo_id: int,
    equipo_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    inscripcion = (
        await db.execute(
            select(Inscripcion).where(
                Inscripcion.torneo_id == torneo_id,
                Inscripcion.equipo_id == equipo_id,
            )
        )
    ).scalar_one_or_none()
    if inscripcion is None:
        raise HTTPException(status_code=404, detail="El equipo no está inscripto en este torneo")

    partidos_jugados = (
        await db.execute(
            select(Partido).where(
                Partido.torneo_id == torneo_id,
                (Partido.equipo_local_id == equipo_id) | (Partido.equipo_visitante_id == equipo_id),
                Partido.jugado.is_(True),
            )
        )
    ).scalars().all()
    if partidos_jugados:
        raise HTTPException(
            status_code=400,
            detail="No se puede desinscribir un equipo que ya ha jugado partidos en este torneo",
        )

    await db.delete(inscripcion)
    await db.commit()
    return {"mensaje": "Equipo desinscripto del torneo correctamente"}


@router.post("/equipos", status_code=status.HTTP_201_CREATED)
async def crear_equipo(
    body: EquipoCreateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    nombre_limpio = body.nombre.strip()
    existente = (
        await db.execute(
            select(Equipo).where(func.lower(Equipo.nombre) == func.lower(nombre_limpio))
        )
    ).scalar_one_or_none()
    if existente:
        if not existente.activo:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un equipo llamado '{existente.nombre}' dado de baja. Podés reactivarlo desde la pestaña Bajas.",
            )
        raise HTTPException(status_code=400, detail="Ya existe un equipo con ese nombre")

    escudo = body.escudo_url.strip() if body.escudo_url and body.escudo_url.strip() else None
    equipo = Equipo(nombre=nombre_limpio, escudo_url=escudo)
    db.add(equipo)
    await db.flush()

    if body.torneo_id:
        torneo = await db.get(Torneo, body.torneo_id)
        if torneo:
            db.add(Inscripcion(torneo_id=body.torneo_id, equipo_id=equipo.id))

    await db.commit()
    await db.refresh(equipo)
    return {"id": equipo.id, "nombre": equipo.nombre, "escudo_url": equipo.escudo_url}


@router.post("/equipos/{equipo_id}/jugadores", status_code=status.HTTP_201_CREATED)
async def agregar_jugador(
    equipo_id: int,
    body: JugadorCreateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    equipo = await db.get(Equipo, equipo_id)
    if equipo is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    jugador = Jugador(
        nombre=body.nombre.strip(),
        apellido=body.apellido.strip(),
        numero=body.numero,
        equipo_id=equipo_id,
        activo=True,
    )
    db.add(jugador)
    await db.commit()
    await db.refresh(jugador)
    return {
        "id": jugador.id,
        "nombre": f"{jugador.nombre} {jugador.apellido}".strip(),
        "nombre_pila": jugador.nombre,
        "apellido": jugador.apellido,
        "numero": jugador.numero,
        "foto_url": jugador.foto_url,
        "equipo_id": jugador.equipo_id,
    }


def _validar_contenido_imagen(extension: str, contents: bytes) -> None:
    if extension == ".png":
        if not contents.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=400,
                detail="El archivo no es una imagen PNG válida.",
            )
    elif extension in {".jpg", ".jpeg"}:
        if not contents.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                status_code=400,
                detail="El archivo no es una imagen JPEG válida.",
            )
    elif extension == ".webp":
        if not (contents.startswith(b"RIFF") and len(contents) > 12 and contents[8:12] == b"WEBP"):
            raise HTTPException(
                status_code=400,
                detail="El archivo no es una imagen WebP válida.",
            )
    elif extension == ".svg":
        try:
            svg_text = contents.decode("utf-8", errors="ignore").lower()
        except Exception:
            raise HTTPException(status_code=400, detail="El archivo SVG no tiene codificación válida.")

        if "<svg" not in svg_text:
            raise HTTPException(status_code=400, detail="El archivo no contiene una estructura SVG válida.")

        palabras_riesgosas = [
            "<script", "javascript:", "onload=", "onerror=", "onclick=",
            "onmouseover=", "<iframe", "<object", "<embed", "data:text/html"
        ]
        for palabra in palabras_riesgosas:
            if palabra in svg_text:
                raise HTTPException(
                    status_code=400,
                    detail="El archivo SVG contiene elementos o scripts no permitidos por seguridad.",
                )


UPLOAD_ESCUDOS_DIR = Path("uploads/escudos")
UPLOAD_ESCUDOS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/equipos/upload-escudo")
async def upload_escudo(
    file: UploadFile = File(...),
    _: object = Depends(require_roles("admin")),
) -> dict:
    extension = Path(file.filename).suffix.lower() if file.filename else ""
    if extension not in {".png", ".jpg", ".jpeg", ".webp", ".svg"}:
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no válido. Se permiten: .png, .jpg, .jpeg, .webp, .svg",
        )

    # Lectura por bloques para evitar agotamiento de memoria (DoS)
    max_size = 5 * 1024 * 1024  # 5 MB
    chunks = []
    total_size = 0
    while chunk := await file.read(64 * 1024):
        total_size += len(chunk)
        if total_size > max_size:
            raise HTTPException(status_code=400, detail="La imagen no debe superar los 5 MB")
        chunks.append(chunk)

    contents = b"".join(chunks)
    if not contents:
        raise HTTPException(status_code=400, detail="El archivo enviado está vacío")

    _validar_contenido_imagen(extension, contents)

    filename = f"escudo_{uuid.uuid4().hex[:12]}{extension}"
    file_path = UPLOAD_ESCUDOS_DIR / filename
    file_path.write_bytes(contents)
    return {"url": f"/api/v1/uploads/escudos/{filename}"}


@router.delete("/equipos/{equipo_id}/jugadores/{jugador_id}")
async def eliminar_jugador(
    equipo_id: int,
    jugador_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    jugador = await db.get(Jugador, jugador_id)
    if not jugador or jugador.equipo_id != equipo_id:
        raise HTTPException(status_code=404, detail="Jugador no encontrado en este equipo")
    jugador.activo = False
    await db.commit()
    return {"mensaje": "Jugador removido del plantel correctamente"}


@router.patch("/equipos/{equipo_id}/jugadores/{jugador_id}")
async def editar_jugador(
    equipo_id: int,
    jugador_id: int,
    body: JugadorUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    jugador = await db.get(Jugador, jugador_id)
    if not jugador or jugador.equipo_id != equipo_id or not jugador.activo:
        raise HTTPException(status_code=404, detail="Jugador no encontrado en este equipo")

    if body.nombre is not None:
        jugador.nombre = body.nombre.strip()
    if body.apellido is not None:
        jugador.apellido = body.apellido.strip()
    if body.numero is not None:
        jugador.numero = body.numero
    if body.foto_url is not None:
        jugador.foto_url = body.foto_url
    if body.equipo_id is not None:
        nuevo_equipo = await db.get(Equipo, body.equipo_id)
        if not nuevo_equipo or not nuevo_equipo.activo:
            raise HTTPException(status_code=404, detail="Equipo destino no encontrado")
        jugador.equipo_id = body.equipo_id

    await db.commit()
    await db.refresh(jugador)
    return {
        "id": jugador.id,
        "nombre": f"{jugador.nombre} {jugador.apellido}".strip(),
        "nombre_pila": jugador.nombre,
        "apellido": jugador.apellido,
        "numero": jugador.numero,
        "foto_url": jugador.foto_url,
        "equipo_id": jugador.equipo_id,
    }


@router.delete("/equipos/{equipo_id}")
async def eliminar_equipo(
    equipo_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    equipo = await db.get(Equipo, equipo_id)
    if equipo is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    equipo.activo = False
    await db.commit()
    return {"mensaje": "Equipo dado de baja correctamente"}


@router.patch("/equipos/{equipo_id}")
async def editar_equipo(
    equipo_id: int,
    body: EquipoUpdateIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    equipo = await db.get(Equipo, equipo_id)
    if equipo is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if body.nombre is not None:
        equipo.nombre = body.nombre.strip()
    if body.escudo_url is not None:
        equipo.escudo_url = body.escudo_url.strip() if body.escudo_url else None
    if body.activo is not None:
        equipo.activo = body.activo
    await db.commit()
    await db.refresh(equipo)
    return {
        "id": equipo.id,
        "nombre": equipo.nombre,
        "escudo_url": equipo.escudo_url,
        "activo": equipo.activo,
        "mensaje": "Equipo actualizado correctamente",
    }


@router.patch("/equipos/{equipo_id}/reactivar")
async def reactivar_equipo(
    equipo_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    equipo = await db.get(Equipo, equipo_id)
    if equipo is None:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    equipo.activo = True
    await db.commit()
    return {"mensaje": f"Equipo '{equipo.nombre}' reactivado correctamente"}