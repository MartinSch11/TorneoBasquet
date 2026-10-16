from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CanchaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre de la cancha o estadio")
    direccion: str | None = Field(None, max_length=200, description="Dirección o ubicación")
    ciudad: str | None = Field("Córdoba", max_length=100, description="Ciudad")
    telefono: str | None = Field(None, max_length=50, description="Teléfono de contacto de la sede")
    notas: str | None = Field(None, max_length=255, description="Tipo de piso, capacidad, vestuarios, etc.")


class CanchaCreate(CanchaBase):
    pass


class CanchaUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=100)
    direccion: str | None = None
    ciudad: str | None = None
    telefono: str | None = None
    notas: str | None = None
    activo: bool | None = None


class CanchaOut(CanchaBase):
    id: int
    activo: bool
    partidos_count: int = 0
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
