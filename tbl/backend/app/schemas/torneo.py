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


class EquipoFichaOut(BaseModel):
    id: int
    nombre: str
    escudo_url: str | None
    activo: bool = True
    pj: int
    pg: int
    pp: int
    jugadores: list[dict]


class EquipoUpdateIn(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    escudo_url: str | None = None
    activo: bool | None = None

    @field_validator("escudo_url")
    @classmethod
    def validar_escudo_url(cls, v: str | None) -> str | None:
        if v is not None:
            v_strip = v.strip()
            v_lower = v_strip.lower()
            if v_lower.startswith(("javascript:", "data:text/html", "vbscript:")):
                raise ValueError("URL de escudo no permitida")
            return v_strip
        return v


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


class EquipoCreateIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    escudo_url: str | None = None
    torneo_id: int | None = None

    @field_validator("escudo_url")
    @classmethod
    def validar_escudo_url(cls, v: str | None) -> str | None:
        if v is not None:
            v_strip = v.strip()
            v_lower = v_strip.lower()
            if v_lower.startswith(("javascript:", "data:text/html", "vbscript:")):
                raise ValueError("URL de escudo no permitida")
            return v_strip
        return v


class InscripcionIn(BaseModel):
    torneo_id: int
    equipo_id: int


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