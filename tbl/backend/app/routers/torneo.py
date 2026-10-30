from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_roles
from app.models import Equipo, Inscripcion, Partido, Torneo
from app.schemas.partido import ProximoPartidoOut, ResultadoOut
from app.schemas.torneo import (
    CopiarEquiposIn,
    GoleadorOut,
    InscripcionIn,
    PosicionOut,
    TorneoCreateIn,
    TorneoEquipoEstadoOut,
    TorneoOut,
    TorneoUpdateIn,
)
from app.services.estadisticas import estadisticas_por_jugador
from app.services.partidos import listar_partidos_con_equipos
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
    return [p.to_dict(i + 1) for i, p in enumerate(lista)]


@router.get("/torneos/{torneo_id}/resultados", response_model=list[ResultadoOut])
async def resultados(
    torneo_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    await _get_torneo(db, torneo_id)
    return await listar_partidos_con_equipos(
        db, torneo_id=torneo_id, jugado=True, limit=limit, offset=(page - 1) * limit, orden_asc=False
    )


@router.get("/torneos/{torneo_id}/proximos-partidos", response_model=list[ProximoPartidoOut])
async def proximos_partidos(torneo_id: int, db: AsyncSession = Depends(get_db)) -> list[dict]:
    await _get_torneo(db, torneo_id)
    return await listar_partidos_con_equipos(
        db, torneo_id=torneo_id, jugado=False, orden_asc=True
    )


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

    otra_inscripcion = (
        await db.execute(
            select(Torneo)
            .join(Inscripcion, Inscripcion.torneo_id == Torneo.id)
            .where(
                Inscripcion.equipo_id == body.equipo_id,
                Torneo.id != torneo_id,
                Torneo.temporada == torneo.temporada,
                Torneo.estado.in_(["activo", "inscripcion"]),
            )
        )
    ).scalar_one_or_none()
    if otra_inscripcion:
        raise HTTPException(
            status_code=400,
            detail=f"'{equipo.nombre}' ya está inscripto en la categoría '{otra_inscripcion.categoria}' para la temporada {torneo.temporada}. Primero debe ser dado de baja en esa categoría.",
        )

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


@router.get("/torneos/{torneo_id}/equipos", response_model=list[TorneoEquipoEstadoOut])
async def listar_equipos_torneo_estado(
    torneo_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> list[dict]:
    torneo = await _get_torneo(db, torneo_id)

    equipos_res = await db.execute(
        select(Equipo).where(Equipo.activo.is_(True)).order_by(Equipo.nombre)
    )
    equipos = equipos_res.scalars().all()

    inscripciones_res = await db.execute(
        select(Inscripcion.equipo_id).where(Inscripcion.torneo_id == torneo_id)
    )
    inscriptos_ids = set(inscripciones_res.scalars().all())

    otros_torneos_res = await db.execute(
        select(Inscripcion.equipo_id, Torneo.id, Torneo.categoria)
        .join(Torneo, Torneo.id == Inscripcion.torneo_id)
        .where(
            Torneo.id != torneo_id,
            Torneo.temporada == torneo.temporada,
            Torneo.estado.in_(["activo", "inscripcion"]),
        )
    )
    equipos_otra_categoria: dict[int, tuple[int, str]] = {}
    for eq_id, t_id, cat in otros_torneos_res.all():
        equipos_otra_categoria[eq_id] = (t_id, cat)

    partidos_res = await db.execute(
        select(Partido.equipo_local_id, Partido.equipo_visitante_id).where(
            Partido.torneo_id == torneo_id,
            Partido.jugado.is_(True),
        )
    )
    partidos_jugados_cuenta: dict[int, int] = {}
    for local_id, visit_id in partidos_res.all():
        partidos_jugados_cuenta[local_id] = partidos_jugados_cuenta.get(local_id, 0) + 1
        partidos_jugados_cuenta[visit_id] = partidos_jugados_cuenta.get(visit_id, 0) + 1

    salida = []
    for eq in equipos:
        inscripto = eq.id in inscriptos_ids
        otra_info = equipos_otra_categoria.get(eq.id)
        salida.append(
            {
                "id": eq.id,
                "nombre": eq.nombre,
                "escudo_url": eq.escudo_url,
                "inscripto": inscripto,
                "partidos_jugados": partidos_jugados_cuenta.get(eq.id, 0),
                "otra_categoria": otra_info[1] if (otra_info and not inscripto) else None,
                "otro_torneo_id": otra_info[0] if (otra_info and not inscripto) else None,
            }
        )
    return salida


@router.post("/torneos/{torneo_id}/copiar-equipos")
async def copiar_equipos_de_otro_torneo(
    torneo_id: int,
    body: CopiarEquiposIn,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    if torneo_id == body.torneo_origen_id:
        raise HTTPException(
            status_code=400,
            detail="El torneo de origen no puede ser el mismo torneo de destino",
        )

    torneo_dest = await _get_torneo(db, torneo_id)
    torneo_orig = await _get_torneo(db, body.torneo_origen_id)

    equipos_orig_res = await db.execute(
        select(Inscripcion.equipo_id)
        .join(Equipo, Equipo.id == Inscripcion.equipo_id)
        .where(
            Inscripcion.torneo_id == body.torneo_origen_id,
            Equipo.activo.is_(True),
        )
    )
    equipos_orig_ids = equipos_orig_res.scalars().all()
    if not equipos_orig_ids:
        raise HTTPException(
            status_code=400,
            detail=f"El torneo '{torneo_orig.nombre} - {torneo_orig.categoria}' no tiene equipos inscriptos para copiar",
        )

    equipos_dest_res = await db.execute(
        select(Inscripcion.equipo_id).where(Inscripcion.torneo_id == torneo_id)
    )
    equipos_dest_ids = set(equipos_dest_res.scalars().all())

    otros_temporada_res = await db.execute(
        select(Inscripcion.equipo_id)
        .join(Torneo, Torneo.id == Inscripcion.torneo_id)
        .where(
            Torneo.id != torneo_id,
            Torneo.temporada == torneo_dest.temporada,
            Torneo.estado.in_(["activo", "inscripcion"]),
        )
    )
    equipos_ocupados_otra_cat = set(otros_temporada_res.scalars().all())

    nuevos_ids = [
        eq_id for eq_id in equipos_orig_ids
        if eq_id not in equipos_dest_ids and eq_id not in equipos_ocupados_otra_cat
    ]
    omitidos_otra_cat = len([eq_id for eq_id in equipos_orig_ids if eq_id in equipos_ocupados_otra_cat])

    for eq_id in nuevos_ids:
        db.add(Inscripcion(torneo_id=torneo_id, equipo_id=eq_id))

    await db.commit()

    mensaje = f"Se inscribieron {len(nuevos_ids)} equipos desde '{torneo_orig.nombre} - {torneo_orig.categoria}'."
    if omitidos_otra_cat > 0:
        mensaje += f" ({omitidos_otra_cat} omitidos por estar en otra categoría de la temporada {torneo_dest.temporada})."

    return {
        "mensaje": mensaje,
        "copiados": len(nuevos_ids),
        "omitidos_otra_categoria": omitidos_otra_cat,
        "total_en_origen": len(equipos_orig_ids),
    }