from pydantic import BaseModel

from app.schemas.galeria import FotoOut
from app.schemas.sponsor import SponsorOut
from app.schemas.torneo import GoleadorOut, PosicionOut, ProximoPartidoOut, ResultadoOut, TorneoOut


class PosicionesCategoriaOut(BaseModel):
    torneo: TorneoOut
    posiciones: list[PosicionOut] = []


class InicioOut(BaseModel):
    torneo_activo: TorneoOut | None = None
    etapa_actual: str = "FASE REGULAR"
    fotos_destacadas: list[FotoOut] = []
    sponsors: list[SponsorOut] = []
    ultimos_partidos: list[ResultadoOut] = []
    proximos_partidos: list[ProximoPartidoOut] = []
    top_posiciones: list[PosicionOut] = []
    posiciones_categorias: list[PosicionesCategoriaOut] = []
    top_goleadores: list[GoleadorOut] = []