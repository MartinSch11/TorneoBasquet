from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Equipo(Base):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    escudo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    activo: Mapped[bool] = mapped_column(default=True)

    jugadores: Mapped[list["Jugador"]] = relationship(back_populates="equipo")
    inscripciones: Mapped[list["Inscripcion"]] = relationship(back_populates="equipo")
    partidos_local: Mapped[list["Partido"]] = relationship(
        back_populates="equipo_local", foreign_keys="Partido.equipo_local_id"
    )
    partidos_visitante: Mapped[list["Partido"]] = relationship(
        back_populates="equipo_visitante", foreign_keys="Partido.equipo_visitante_id"
    )