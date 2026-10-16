from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Jugador(Base):
    __tablename__ = "jugadores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    numero: Mapped[int | None] = mapped_column(Integer, nullable=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    equipo: Mapped["Equipo"] = relationship(back_populates="jugadores")
    estadisticas: Mapped[list["EstadisticaPartido"]] = relationship(back_populates="jugador")