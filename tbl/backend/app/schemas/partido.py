from datetime import date, time
from pydantic import BaseModel, Field


class PartidoResultadoIn(BaseModel):
    pts_local: int = Field(ge=0)
    pts_visitante: int = Field(ge=0)


class PartidoCreateIn(BaseModel):
    torneo_id: int
    fecha_numero: int = Field(ge=1)
    fecha_dia: date | None = None
    equipo_local_id: int
    equipo_visitante_id: int
    fase: str = "FASE REGULAR"
    cancha: str | None = None
    horario: time | None = None


class PartidoUpdateIn(BaseModel):
    fecha_numero: int | None = Field(default=None, ge=1)
    fecha_dia: date | None = None
    equipo_local_id: int | None = None
    equipo_visitante_id: int | None = None
    fase: str | None = None
    cancha: str | None = None
    horario: time | None = None
    jugado: bool | None = None


class ResultadoOut(BaseModel):
    id: int
    fase: str
    fecha_id: int
    numero_fecha: int | None
    fecha: str | None
    horario: str | None
    cancha: str | None
    equipo_local: str
    equipo_visitante: str
    pts_local: int | None
    pts_visitante: int | None
    escudo_local: str | None = None
    escudo_visitante: str | None = None
    equipo_local_id: int | None = None
    equipo_visitante_id: int | None = None
    jugado: bool | None = None
    torneo_nombre: str | None = None
    categoria: str | None = None


class ProximoPartidoOut(BaseModel):
    id: int
    fase: str
    numero_fecha: int | None
    fecha: str | None
    horario: str | None
    cancha: str | None
    equipo_local: str
    equipo_visitante: str
    escudo_local: str | None = None
    escudo_visitante: str | None = None
    equipo_local_id: int | None = None
    equipo_visitante_id: int | None = None


class EstadisticaPartidoDetalleOut(BaseModel):
    jugador_id: int
    jugador_nombre: str
    numero: int | None = None
    equipo_id: int
    libres_conv: int = 0
    libres_int: int = 0
    dobles_conv: int = 0
    dobles_int: int = 0
    triples_conv: int = 0
    triples_int: int = 0
    asistencias: int = 0
    reb_ofensivos: int = 0
    reb_defensivos: int = 0
    faltas_personales: int = 0
    faltas_recibidas: int = 0
    faltas_tecnicas: int = 0
    faltas_antideportivas: int = 0
    perdidas: int = 0
    bloqueos: int = 0
    recuperos: int = 0
    puntos: int = 0