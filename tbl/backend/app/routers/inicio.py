from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models import Foto, Sponsor, Torneo
from app.schemas.inicio import InicioOut
from app.services.estadisticas import estadisticas_por_jugador
from app.services.partidos import listar_partidos_con_equipos, normalizar_fase
from app.services.posiciones import calcular_posiciones

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
        pos_top_t = [p.to_dict(i + 1) for i, p in enumerate(lista_pos_t[:5])]
        posiciones_categorias.append({"torneo": t, "posiciones": pos_top_t})

    if torneo:
        ultimos_partidos = await listar_partidos_con_equipos(
            db, torneo_id=torneo.id, jugado=True, limit=6, orden_asc=False, con_normalizacion=True
        )
        proximos_partidos = await listar_partidos_con_equipos(
            db, torneo_id=torneo.id, jugado=False, limit=4, orden_asc=True, con_normalizacion=True
        )
        top_posiciones = posiciones_categorias[0]["posiciones"] if posiciones_categorias else []


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