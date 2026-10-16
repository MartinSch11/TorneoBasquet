from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Torneo(Base):
    __tablename__ = "torneos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    edicion: Mapped[int]
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)  # TBL A | TBL B | TBL C | MÁS 35
    grupo: Mapped[str | None] = mapped_column(String(20), nullable=True)  # GRUPO 1 | GRUPO 2 | NULL
    temporada: Mapped[str] = mapped_column(String(10), nullable=False)  # 2026
    estado: Mapped[str] = mapped_column(String(20), nullable=False)  # inscripcion | activo | finalizado

    fechas: Mapped[list["Fecha"]] = relationship(back_populates="torneo")
    partidos: Mapped[list["Partido"]] = relationship(back_populates="torneo")
    inscripciones: Mapped[list["Inscripcion"]] = relationship(back_populates="torneo")
    albumes: Mapped[list["Album"]] = relationship(back_populates="torneo")


class Inscripcion(Base):
    __tablename__ = "inscripciones"
    __table_args__ = (UniqueConstraint("torneo_id", "equipo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    torneo_id: Mapped[int] = mapped_column(ForeignKey("torneos.id"), nullable=False)
    equipo_id: Mapped[int] = mapped_column(ForeignKey("equipos.id"), nullable=False)

    torneo: Mapped[Torneo] = relationship(back_populates="inscripciones")
    equipo: Mapped["Equipo"] = relationship(back_populates="inscripciones")