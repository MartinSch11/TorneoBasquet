from pydantic import BaseModel, Field


class PartidoResultadoIn(BaseModel):
    pts_local: int = Field(ge=0)
    pts_visitante: int = Field(ge=0)