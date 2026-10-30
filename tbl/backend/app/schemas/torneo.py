from datetime import date, time
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TorneoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    edicion: int
    categoria: str
    grupo: str | None
    temporada: str
    estado: str


class PosicionOut(BaseModel):
    posicion: int
    equipo_id: int
    equipo: str
    escudo_url: str | None
    pj: int
    pg: int
    pp: int
    puntos_favor: int = 0
    puntos_contra: int = 0
    dgo: int = 0
    porcentaje: float
    puntos: int


from app.schemas.partido import (
    EstadisticaPartidoDetalleOut,
    PartidoCreateIn,
    PartidoResultadoIn,
    PartidoUpdateIn,
    ProximoPartidoOut,
    ResultadoOut,
)


class GoleadorOut(BaseModel):
    jugador_id: int
    jugador: str
    equipo: str
    escudo_url: str | None = None
    pj: int
    puntos: int
    promedio: float


class EquipoListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    escudo_url: str | None
    activo: bool = True
    torneo_id: int | None = None
    torneo_nombre: str | None = None
    categoria: str | None = None


class PartidoDisputadoOut(BaseModel):
    id: int
    fase: str
    instancia: str  # "Local" | "Visitante"
    dia: str | None = None  # "27-10-2026"
    fecha_numero: int | None = None  # 10
    versus: str
    versus_id: int
    versus_escudo_url: str | None = None
    resultado: str  # "P 43-46" | "G 51-44"
    gano: bool
    pts_local: int | None = None
    pts_visitante: int | None = None
    pts_equipo: int | None = None
    pts_rival: int | None = None
    cancha: str | None = None


class TorneoEquipoOut(BaseModel):
    id: int
    nombre: str
    edicion: int
    categoria: str
    grupo: str | None = None
    temporada: str
    estado: str
    etiqueta: str


class JugadorFichaOut(BaseModel):
    id: int
    nombre: str
    nombre_pila: str | None = None
    apellido: str | None = None
    numero: int | None = None
    foto_url: str | None = None
    pj: int = 0
    pct_1: float = 0.0
    pct_2: float = 0.0
    pct_3: float = 0.0
    ptos: int = 0
    pp: float = 0.0
    asistencias: int = 0
    ro: int = 0
    rd: int = 0
    fp: int = 0
    fr: int = 0
    pf: float = 0.0
    recuperos: int = 0
    perdidas: int = 0
    bloqueos: int = 0
    val: float = 0.0


class EquipoFichaOut(BaseModel):
    id: int
    nombre: str
    escudo_url: str | None
    activo: bool = True
    pj: int
    pg: int
    pp: int
    jugadores: list[JugadorFichaOut] | list[dict] = []
    partidos_disputados: list[PartidoDisputadoOut] = []
    torneos: list[TorneoEquipoOut] = []
    torneo_actual_id: int | None = None


def validar_url_segura(v: str | None) -> str | None:
    if v is not None:
        v_strip = v.strip()
        v_lower = v_strip.lower()
        if v_lower.startswith(("javascript:", "data:text/html", "vbscript:")):
            raise ValueError("URL de escudo no permitida")
        return v_strip
    return v


class EquipoUpdateIn(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    escudo_url: str | None = None
    activo: bool | None = None

    @field_validator("escudo_url")
    @classmethod
    def validar_escudo_url(cls, v: str | None) -> str | None:
        return validar_url_segura(v)



class EquipoCreateIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    escudo_url: str | None = None
    torneo_id: int | None = None

    @field_validator("escudo_url")
    @classmethod
    def validar_escudo_url(cls, v: str | None) -> str | None:
        return validar_url_segura(v)


class InscripcionIn(BaseModel):
    torneo_id: int | None = None
    equipo_id: int


class CopiarEquiposIn(BaseModel):
    torneo_origen_id: int


class TorneoEquipoEstadoOut(BaseModel):
    id: int
    nombre: str
    escudo_url: str | None = None
    inscripto: bool = False
    partidos_jugados: int = 0
    otra_categoria: str | None = None
    otro_torneo_id: int | None = None



class JugadorCreateIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    numero: int | None = Field(default=None, ge=0, le=99)


class JugadorUpdateIn(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    apellido: str | None = Field(default=None, min_length=1, max_length=100)
    numero: int | None = Field(default=None, ge=0, le=99)
    foto_url: str | None = None
    equipo_id: int | None = None


class TorneoCreateIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    edicion: int = Field(default=1, ge=1)
    categoria: str = Field(min_length=1, max_length=50)
    grupo: str | None = None
    temporada: str = Field(min_length=4, max_length=10)
    estado: str = Field(default="activo", max_length=20)


class TorneoUpdateIn(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    edicion: int | None = Field(default=None, ge=1)
    categoria: str | None = Field(default=None, min_length=1, max_length=50)
    grupo: str | None = None
    temporada: str | None = Field(default=None, min_length=4, max_length=10)
    estado: str | None = Field(default=None, max_length=20)