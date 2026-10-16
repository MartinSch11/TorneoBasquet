from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Album(Base):
    __tablename__ = "albumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id"), nullable=False)
    partido_id: Mapped[int | None] = mapped_column(ForeignKey("partidos.id"), nullable=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    subido_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)

    torneo: Mapped["Torneo"] = relationship(back_populates="albumes")
    partido: Mapped["Partido"] = relationship(back_populates="albumes")
    fotos: Mapped[list["Foto"]] = relationship(back_populates="album")