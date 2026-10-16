from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Roles = Literal["admin", "visitante"]


class LoginRequest(BaseModel):
    usuario: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario: str
    rol: str
    activo: bool


class UsuarioCreate(BaseModel):
    usuario: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=100)
    rol: Roles


class UsuarioUpdate(BaseModel):
    rol: Roles | None = None
    activo: bool | None = None