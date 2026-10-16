from pydantic import BaseModel, Field


class EstadisticaIn(BaseModel):
    jugador_id: int
    libres_conv: int = Field(default=0, ge=0)
    libres_int: int = Field(default=0, ge=0)
    dobles_conv: int = Field(default=0, ge=0)
    dobles_int: int = Field(default=0, ge=0)
    triples_conv: int = Field(default=0, ge=0)
    triples_int: int = Field(default=0, ge=0)
    asistencias: int = Field(default=0, ge=0)
    reb_ofensivos: int = Field(default=0, ge=0)
    reb_defensivos: int = Field(default=0, ge=0)
    faltas_personales: int = Field(default=0, ge=0)
    faltas_recibidas: int = Field(default=0, ge=0)
    faltas_tecnicas: int = Field(default=0, ge=0)
    faltas_antideportivas: int = Field(default=0, ge=0)
    perdidas: int = Field(default=0, ge=0)
    bloqueos: int = Field(default=0, ge=0)
    recuperos: int = Field(default=0, ge=0)


class EstadisticasPartidoIn(BaseModel):
    estadisticas: list[EstadisticaIn]


class TiroStats(BaseModel):
    conv: int
    int: int


class TirosOut(BaseModel):
    libres: TiroStats
    dobles: TiroStats
    triples: TiroStats


class BoxscoreOut(BaseModel):
    puntos: int
    efectividad: float
    ro: int
    rd: int
    rebotes: int
    asistencias: int
    recuperos: int
    perdidas: int
    faltas_personales: int
    faltas_recibidas: int
    faltas_tecnicas: int
    faltas_antideportivas: int
    faltas_totales: int
    bloqueos: int
    valoracion: float


class EstadisticaEquipoOut(BoxscoreOut):
    equipo_id: int
    equipo: str
    escudo_url: str | None
    pj: int
    pc: int
    pr: int
    dif: int
    tiros: TirosOut
    valor: float


class EstadisticaJugadorOut(BoxscoreOut):
    jugador_id: int
    jugador: str
    equipo: str
    escudo_url: str | None = None
    pj: int
    promedio: float
    tiros: TirosOut
    valor: float