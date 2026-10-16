from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.deps import get_db, require_roles
from app.models import Equipo, Fecha, Foto, Partido, Sponsor, Torneo, Usuario
from app.schemas.inicio import InicioOut
from app.schemas.sponsor import SponsorCreate, SponsorOut, SponsorUpdate
from app.services.estadisticas import estadisticas_por_jugador
from app.services.posiciones import calcular_posiciones


class SponsorOrdenIn(BaseModel):
    orden: list[int]


def normalizar_fase(fase: str | None) -> str:
    if not fase:
        return "FASE REGULAR"
    f = fase.strip().upper()
    if "PROMOCION" in f or "DESCENSO" in f:
        return "PROMOCIÓN"
    return fase


router = APIRouter()


@router.get("/inicio", response_model=InicioOut)
async def inicio(db: AsyncSession = Depends(get_db)) -> dict:
    torneos_activos = list(
        (
            await db.execute(
                select(Torneo)
                .where(Torneo.estado == "activo")
                .order_by(Torneo.temporada.desc(), Torneo.categoria.asc(), Torneo.id.asc())
            )
        )
        .scalars()
        .all()
    )
    torneo = torneos_activos[0] if torneos_activos else None

    fotos_row = await db.execute(
        select(Foto).order_by(Foto.created_at.desc(), Foto.id.desc()).limit(6)
    )
    sponsors_row = await db.execute(
        select(Sponsor)
        .where(Sponsor.activo.is_(True))
        .order_by(Sponsor.orden.asc(), Sponsor.id.asc())
    )

    ultimos_partidos = []
    proximos_partidos = []
    top_posiciones = []
    posiciones_categorias = []
    top_goleadores = []

    for t in torneos_activos:
        lista_pos_t = await calcular_posiciones(db, t.id)
        pos_top_t = [
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
            for i, p in enumerate(lista_pos_t[:5])
        ]
        posiciones_categorias.append({"torneo": t, "posiciones": pos_top_t})

    if torneo:
        el = aliased(Equipo)
        ev = aliased(Equipo)

        # Últimos partidos disputados
        q_ult = (
            select(
                Partido.id,
                Partido.fase,
                Fecha.id.label("fecha_id"),
                Fecha.numero.label("numero_fecha"),
                Fecha.fecha,
                Partido.horario,
                Partido.cancha,
                el.nombre.label("equipo_local"),
                ev.nombre.label("equipo_visitante"),
                el.escudo_url.label("escudo_local"),
                ev.escudo_url.label("escudo_visitante"),
                Partido.pts_local,
                Partido.pts_visitante,
                Partido.equipo_local_id,
                Partido.equipo_visitante_id,
            )
            .join(Fecha, Fecha.id == Partido.fecha_id)
            .join(el, el.id == Partido.equipo_local_id)
            .join(ev, ev.id == Partido.equipo_visitante_id)
            .where(Partido.torneo_id == torneo.id, Partido.jugado.is_(True))
            .order_by(Fecha.fecha.desc(), Partido.id.desc())
            .limit(6)
        )
        rows_ult = (await db.execute(q_ult)).all()
        ultimos_partidos = [
            {
                "id": r.id,
                "fase": normalizar_fase(r.fase),
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
            for r in rows_ult
        ]

        # Próximos partidos
        q_prox = (
            select(
                Partido.id,
                Partido.fase,
                Fecha.numero.label("numero_fecha"),
                Fecha.fecha,
                Partido.horario,
                Partido.cancha,
                el.nombre.label("equipo_local"),
                ev.nombre.label("equipo_visitante"),
                el.escudo_url.label("escudo_local"),
                ev.escudo_url.label("escudo_visitante"),
                Partido.equipo_local_id,
                Partido.equipo_visitante_id,
            )
            .join(Fecha, Fecha.id == Partido.fecha_id)
            .join(el, el.id == Partido.equipo_local_id)
            .join(ev, ev.id == Partido.equipo_visitante_id)
            .where(Partido.torneo_id == torneo.id, Partido.jugado.is_(False))
            .order_by(Fecha.fecha.asc().nulls_last(), Partido.id.asc())
            .limit(4)
        )
        rows_prox = (await db.execute(q_prox)).all()
        proximos_partidos = [
            {
                "id": r.id,
                "fase": normalizar_fase(r.fase),
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
            for r in rows_prox
        ]

        # Top 5 Posiciones
        lista_pos = await calcular_posiciones(db, torneo.id)
        top_posiciones = [
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
            for i, p in enumerate(lista_pos[:5])
        ]

        # Top 3 Goleadores
        gols = await estadisticas_por_jugador(db, torneo.id, metrica="puntos")
        top_goleadores = [
            {
                "jugador_id": r["jugador_id"],
                "jugador": r["jugador"],
                "equipo": r["equipo"],
                "escudo_url": r.get("escudo_url"),
                "pj": r["pj"],
                "puntos": r["puntos"],
                "promedio": r["promedio"],
            }
            for r in gols[:3]
        ]
        # Determinar la fase o etapa en juego de forma dinámica
        fase_raw = "FASE REGULAR"
        if proximos_partidos:
            fase_raw = proximos_partidos[0].get("fase") or "FASE REGULAR"
        elif ultimos_partidos:
            fase_raw = ultimos_partidos[0].get("fase") or "FASE REGULAR"

        mapa_fases = {
            "FASE REGULAR": "FASE REGULAR",
            "OCTAVOS": "OCTAVOS DE FINAL",
            "CUARTOS": "CUARTOS DE FINAL",
            "SEMIFINAL": "SEMIFINALES",
            "FINAL": "GRAN FINAL",
            "PROMOCION / DESCENSO": "PROMOCIÓN",
            "PROMOCION": "PROMOCIÓN",
            "PROMOCIÓN": "PROMOCIÓN",
        }
        etapa_actual = mapa_fases.get(fase_raw.upper(), normalizar_fase(fase_raw))
    else:
        etapa_actual = "FASE REGULAR"

    return {
        "torneo_activo": torneo,
        "etapa_actual": etapa_actual,
        "fotos_destacadas": list(fotos_row.scalars().all()),
        "sponsors": list(sponsors_row.scalars().all()),
        "ultimos_partidos": ultimos_partidos,
        "proximos_partidos": proximos_partidos,
        "top_posiciones": top_posiciones,
        "posiciones_categorias": posiciones_categorias,
        "top_goleadores": top_goleadores,
    }


@router.get("/sponsors", response_model=list[SponsorOut])
async def listar_sponsors(
    db: AsyncSession = Depends(get_db), todos: bool = False
) -> list[Sponsor]:
    query = select(Sponsor).order_by(Sponsor.orden.asc(), Sponsor.id.asc())
    if not todos:
        query = query.where(Sponsor.activo.is_(True))
    row = await db.execute(query)
    return list(row.scalars().all())


@router.post("/sponsors", response_model=SponsorOut, status_code=status.HTTP_201_CREATED)
async def crear_sponsor(
    body: SponsorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> Sponsor:
    sponsor = Sponsor(**body.model_dump())
    db.add(sponsor)
    await db.commit()
    await db.refresh(sponsor)
    return sponsor


@router.patch("/sponsors/{sponsor_id}", response_model=SponsorOut)
async def actualizar_sponsor(
    sponsor_id: int,
    body: SponsorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> Sponsor:
    sponsor = await db.get(Sponsor, sponsor_id)
    if sponsor is None:
        raise HTTPException(status_code=404, detail="Sponsor no encontrado")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(sponsor, campo, valor)
    await db.commit()
    await db.refresh(sponsor)
    return sponsor


@router.put("/sponsors/orden")
async def reordenar_sponsors(
    body: SponsorOrdenIn,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    for pos, sponsor_id in enumerate(body.orden):
        sponsor = await db.get(Sponsor, sponsor_id)
        if sponsor is not None:
            sponsor.orden = pos
    await db.commit()
    return {"ok": True}


@router.delete("/sponsors/{sponsor_id}")
async def eliminar_sponsor(
    sponsor_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    sponsor = await db.get(Sponsor, sponsor_id)
    if sponsor is None:
        raise HTTPException(status_code=404, detail="Sponsor no encontrado")
    await db.delete(sponsor)
    await db.commit()
    return {"ok": True}