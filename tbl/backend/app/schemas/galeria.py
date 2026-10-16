from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class FotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    album_id: int
    url: str
    titulo: str | None
    orden: int


class AlbumOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    torneo_id: int
    partido_id: int | None
    titulo: str
    fecha: date


class AlbumDetalleOut(AlbumOut):
    fotos: list[FotoOut]


class FotosPageOut(BaseModel):
    total: int
    page: int
    limit: int
    items: list[FotoOut]


class AlbumCreate(BaseModel):
    torneo_id: int
    partido_id: int | None = None
    titulo: str = Field(min_length=1, max_length=200)
    fecha: date


class UploadUrlOut(BaseModel):
    object_name: str
    url: str


class FotoCreate(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    titulo: str | None = Field(default=None, max_length=200)
    orden: int = 0