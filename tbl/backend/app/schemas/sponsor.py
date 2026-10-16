from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validar_url_segura(url: str | None, permitir_vacio: bool = False) -> str | None:
    if url is None:
        return None
    url_limpia = url.strip()
    if not url_limpia and permitir_vacio:
        return None
    url_lower = url_limpia.lower()
    if url_lower.startswith(("javascript:", "data:text/html", "vbscript:")):
        raise ValueError("Esquema de URL no permitido por seguridad")
    return url_limpia


class SponsorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    logo_url: str
    url_sitio: str | None
    orden: int
    activo: bool


class SponsorCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    logo_url: str = Field(min_length=1, max_length=500)
    url_sitio: str | None = Field(default=None, max_length=500)
    orden: int = 0
    activo: bool = True

    @field_validator("logo_url")
    @classmethod
    def validar_logo(cls, v: str) -> str:
        res = _validar_url_segura(v)
        if not res:
            raise ValueError("Logo URL requerida")
        return res

    @field_validator("url_sitio")
    @classmethod
    def validar_sitio(cls, v: str | None) -> str | None:
        return _validar_url_segura(v, permitir_vacio=True)


class SponsorUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    logo_url: str | None = Field(default=None, min_length=1, max_length=500)
    url_sitio: str | None = Field(default=None, min_length=0, max_length=500)
    orden: int | None = None
    activo: bool | None = None

    @field_validator("logo_url")
    @classmethod
    def validar_logo(cls, v: str | None) -> str | None:
        return _validar_url_segura(v, permitir_vacio=True)

    @field_validator("url_sitio")
    @classmethod
    def validar_sitio(cls, v: str | None) -> str | None:
        return _validar_url_segura(v, permitir_vacio=True)