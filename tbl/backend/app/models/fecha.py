from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Fecha(Base):
    __tablename__ = "fechas"

    id: Mapped[int] = mapped_column(primary_key=True)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id"), nullable=False)
    numero: Mapped[int]
    descripcion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)

    torneo: Mapped["Torneo"] = relationship(back_populates="fechas")
    partidos: Mapped[list["Partido"]] = relationship(back_populates="fecha")