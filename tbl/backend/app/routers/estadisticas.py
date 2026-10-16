from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models import Torneo
from app.schemas.estadistica import EstadisticaEquipoOut, EstadisticaJugadorOut
from app.services.estadisticas import METRICAS_EQUIPO, estadisticas_por_equipo, estadisticas_por_jugador

router = APIRouter()

METRICAS_VALIDAS = set(METRICAS_EQUIPO.keys())


async def _validar_torneo_y_metrica(db: AsyncSession, torneo_id: int, metrica: str) -> None:
    torneo = await db.get(Torneo, torneo_id)
    if torneo is None:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if metrica not in METRICAS_VALIDAS:
        raise HTTPException(
            status_code=422,
            detail=f"Métrica inválida. Válidas: {sorted(METRICAS_VALIDAS)}",
        )


@router.get("/equipos", response_model=list[EstadisticaEquipoOut])
async def equipos(
    torneo_id: int = Query(...),
    metrica: str = Query("puntos"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await _validar_torneo_y_metrica(db, torneo_id, metrica)
    return await estadisticas_por_equipo(db, torneo_id, metrica)


@router.get("/jugadores", response_model=list[EstadisticaJugadorOut])
async def jugadores(
    torneo_id: int = Query(...),
    metrica: str = Query("puntos"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await _validar_torneo_y_metrica(db, torneo_id, metrica)
    return await estadisticas_por_jugador(db, torneo_id, metrica)