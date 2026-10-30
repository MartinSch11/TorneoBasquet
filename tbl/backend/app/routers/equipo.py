import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, require_roles
from app.models import Equipo, EstadisticaPartido, Fecha, Inscripcion, Jugador, Partido, Torneo
from app.schemas.torneo import (
    EquipoCreateIn,
    EquipoFichaOut,
    EquipoListOut,
    EquipoUpdateIn,
    JugadorCreateIn,
    JugadorUpdateIn,
)

router = APIRouter()

UPLOAD_ESCUDOS_DIR = Path("uploads/escudos")
UPLOAD_ESCUDOS_DIR.mkdir(parents=True, exist_ok=True)


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

    # Identificar torneos en los que participa o disputó partidos el equipo
    t_ids_q = (
        select(Inscripcion.torneo_id)
        .where(Inscripcion.equipo_id == equipo_id)
        .union(
            select(Partido.torneo_id)
            .where((Partido.equipo_local_id == equipo_id) | (Partido.equipo_visitante_id == equipo_id))
        )
    )
    t_ids = list((await db.execute(t_ids_q)).scalars().all())

    torneos_list = []
    if t_ids:
        torneos_db = list(
            (
                await db.execute(
                    select(Torneo)
                    .where(Torneo.id.in_(t_ids))
                    .order_by(Torneo.edicion.desc(), Torneo.id.desc())
                )
            )
            .scalars()
            .all()
        )
        for t in torneos_db:
            partes = []
            if t.edicion:
                partes.append(f"EDICIÓN {t.edicion}")
            if t.categoria:
                partes.append(t.categoria)
            if t.grupo:
                partes.append(t.grupo)
            etiqueta = " - ".join(partes) if partes else t.nombre

            torneos_list.append(
                {
                    "id": t.id,
                    "nombre": t.nombre,
                    "edicion": t.edicion,
                    "categoria": t.categoria,
                    "grupo": t.grupo,
                    "temporada": t.temporada,
                    "estado": t.estado,
                    "etiqueta": etiqueta,
                }
            )

    torneo_actual_id = None
    if torneo_id is not None:
        torneo_actual_id = torneo_id
    elif torneos_list:
        torneo_activo = next((t for t in torneos_list if t["estado"] == "activo"), torneos_list[0])
        torneo_actual_id = torneo_activo["id"]

    partidos_q = (
        select(Partido)
        .join(Fecha, Partido.fecha_id == Fecha.id)
        .options(
            selectinload(Partido.fecha),
            selectinload(Partido.equipo_local),
            selectinload(Partido.equipo_visitante),
        )
        .where(
            (Partido.equipo_local_id == equipo_id) | (Partido.equipo_visitante_id == equipo_id),
            Partido.jugado.is_(True),
        )
    )
    if torneo_actual_id is not None:
        partidos_q = partidos_q.where(Partido.torneo_id == torneo_actual_id)

    partidos_q = partidos_q.order_by(Fecha.numero.desc(), Fecha.fecha.desc().nulls_last(), Partido.id.desc())
    partidos = list((await db.execute(partidos_q)).scalars().all())

    pj = len(partidos)
    pg = pp = 0
    partidos_disputados = []

    for p in partidos:
        puntos_local = p.pts_local or 0
        puntos_visit = p.pts_visitante or 0
        es_local = p.equipo_local_id == equipo_id
        rival = p.equipo_visitante if es_local else p.equipo_local

        pts_equipo = puntos_local if es_local else puntos_visit
        pts_rival = puntos_visit if es_local else puntos_local
        gano = pts_equipo > pts_rival

        if gano:
            pg += 1
        else:
            pp += 1

        dia_str = None
        if p.fecha and p.fecha.fecha:
            f = p.fecha.fecha
            dia_str = f"{f.day:02d}-{f.month:02d}-{f.year}"

        fase_limpia = (p.fase or "FASE REGULAR").upper()
        if "RONDA REGULAR" in fase_limpia:
            fase_limpia = "FASE REGULAR"

        resultado_str = f"{'G' if gano else 'P'} {puntos_local}-{puntos_visit}"

        partidos_disputados.append(
            {
                "id": p.id,
                "fase": fase_limpia,
                "instancia": "Local" if es_local else "Visitante",
                "dia": dia_str,
                "fecha_numero": p.fecha.numero if p.fecha else None,
                "versus": rival.nombre.upper() if rival else "RIVAL",
                "versus_id": rival.id if rival else 0,
                "versus_escudo_url": rival.escudo_url if rival else None,
                "resultado": resultado_str,
                "gano": gano,
                "pts_local": puntos_local,
                "pts_visitante": puntos_visit,
                "pts_equipo": pts_equipo,
                "pts_rival": pts_rival,
                "cancha": p.cancha,
            }
        )

    # Estadísticas agregadas por jugador del equipo en el torneo actual
    stats_jugadores_q = (
        select(
            EstadisticaPartido.jugador_id,
            func.count(func.distinct(EstadisticaPartido.partido_id)).label("pj"),
            func.sum(EstadisticaPartido.libres_conv).label("libres_conv"),
            func.sum(EstadisticaPartido.libres_int).label("libres_int"),
            func.sum(EstadisticaPartido.dobles_conv).label("dobles_conv"),
            func.sum(EstadisticaPartido.dobles_int).label("dobles_int"),
            func.sum(EstadisticaPartido.triples_conv).label("triples_conv"),
            func.sum(EstadisticaPartido.triples_int).label("triples_int"),
            func.sum(EstadisticaPartido.asistencias).label("asistencias"),
            func.sum(EstadisticaPartido.reb_ofensivos).label("reb_ofensivos"),
            func.sum(EstadisticaPartido.reb_defensivos).label("reb_defensivos"),
            func.sum(EstadisticaPartido.faltas_personales).label("faltas_personales"),
            func.sum(EstadisticaPartido.faltas_recibidas).label("faltas_recibidas"),
            func.sum(EstadisticaPartido.perdidas).label("perdidas"),
            func.sum(EstadisticaPartido.bloqueos).label("bloqueos"),
            func.sum(EstadisticaPartido.recuperos).label("recuperos"),
        )
        .join(Partido, EstadisticaPartido.partido_id == Partido.id)
        .join(Jugador, EstadisticaPartido.jugador_id == Jugador.id)
        .where(
            Jugador.equipo_id == equipo_id,
            Partido.jugado.is_(True),
        )
    )
    if torneo_actual_id is not None:
        stats_jugadores_q = stats_jugadores_q.where(Partido.torneo_id == torneo_actual_id)

    stats_jugadores_q = stats_jugadores_q.group_by(EstadisticaPartido.jugador_id)
    stats_rows = (await db.execute(stats_jugadores_q)).all()
    stats_map = {r.jugador_id: r for r in stats_rows}

    plantel = await db.execute(
        select(Jugador)
        .where(Jugador.equipo_id == equipo_id, Jugador.activo.is_(True))
        .order_by(Jugador.apellido.asc(), Jugador.nombre.asc())
    )
    jugadores = plantel.scalars().all()

    jugadores_salida = []
    for j in jugadores:
        st = stats_map.get(j.id)
        pj_j = int(st.pj or 0) if st else 0
        l_c = int(st.libres_conv or 0) if st else 0
        l_i = int(st.libres_int or 0) if st else 0
        d_c = int(st.dobles_conv or 0) if st else 0
        d_i = int(st.dobles_int or 0) if st else 0
        t_c = int(st.triples_conv or 0) if st else 0
        t_i = int(st.triples_int or 0) if st else 0
        asist = int(st.asistencias or 0) if st else 0
        ro = int(st.reb_ofensivos or 0) if st else 0
        rd = int(st.reb_defensivos or 0) if st else 0
        fp = int(st.faltas_personales or 0) if st else 0
        fr = int(st.faltas_recibidas or 0) if st else 0
        perd = int(st.perdidas or 0) if st else 0
        bloq = int(st.bloqueos or 0) if st else 0
        recup = int(st.recuperos or 0) if st else 0

        pct_1 = round(l_c * 100.0 / l_i, 2) if l_i else 0.0
        pct_2 = round(d_c * 100.0 / d_i, 2) if d_i else 0.0
        pct_3 = round(t_c * 100.0 / t_i, 2) if t_i else 0.0
        puntos = l_c + d_c * 2 + t_c * 3
        pp = round(puntos / pj_j, 2) if pj_j else 0.0
        pf = round(fp / pj_j, 2) if pj_j else 0.0
        tiros_fallados = (l_i - l_c) + (d_i - d_c) + (t_i - t_c)
        val_total = puntos + (ro + rd) + asist + recup + bloq + fr - tiros_fallados - perd - fp
        val = round(val_total / pj_j, 2) if pj_j else 0.0

        if j.apellido and j.nombre:
            nombre_mostrar = f"{j.apellido} {j.nombre}".strip().upper()
        else:
            nombre_mostrar = (j.nombre or "").strip().upper()

        jugadores_salida.append(
            {
                "id": j.id,
                "nombre": nombre_mostrar,
                "nombre_pila": j.nombre,
                "apellido": j.apellido,
                "numero": j.numero,
                "foto_url": j.foto_url,
                "pj": pj_j,
                "pct_1": pct_1,
                "pct_2": pct_2,
                "pct_3": pct_3,
                "ptos": puntos,
                "pp": pp,
                "asistencias": asist,
                "ro": ro,
                "rd": rd,
                "fp": fp,
                "fr": fr,
                "pf": pf,
                "recuperos": recup,
                "perdidas": perd,
                "bloqueos": bloq,
                "val": val,
            }
        )

    return {
        "id": equipo.id,
        "nombre": equipo.nombre,
        "escudo_url": equipo.escudo_url,
        "activo": equipo.activo,
        "pj": pj,
        "pg": pg,
        "pp": pp,
        "partidos_disputados": partidos_disputados,
        "torneos": torneos_list,
        "torneo_actual_id": torneo_actual_id,
        "jugadores": jugadores_salida,
    }


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
