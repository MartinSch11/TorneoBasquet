from datetime import time

from sqlalchemy import Boolean, ForeignKey, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Partido(Base):
    __tablename__ = "partidos"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha_id: Mapped[int] = mapped_column(ForeignKey("fechas.id"), nullable=False)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id"), nullable=False)
    equipo_local_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)
    equipo_visitante_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)
    pts_local: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pts_visitante: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fase: Mapped[str] = mapped_column(String(50), default="FASE REGULAR")  # FASE REGULAR | PLAYOFFS
    horario: Mapped[time | None] = mapped_column(Time, nullable=True)
    cancha: Mapped[str | None] = mapped_column(String(100), nullable=True)
    jugado: Mapped[bool] = mapped_column(Boolean, default=False)

    fecha: Mapped["Fecha"] = relationship(back_populates="partidos")
    torneo: Mapped["Torneo"] = relationship(back_populates="partidos")
    equipo_local: Mapped["Equipo"] = relationship(
        back_populates="partidos_local", foreign_keys=[equipo_local_id]
    )
    equipo_visitante: Mapped["Equipo"] = relationship(
        back_populates="partidos_visitante", foreign_keys=[equipo_visitante_id]
    )
    estadisticas: Mapped[list["EstadisticaPartido"]] = relationship(back_populates="partido")
    albumes: Mapped[list["Album"]] = relationship(back_populates="partido")