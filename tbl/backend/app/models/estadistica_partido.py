from sqlalchemy import ForeignKey, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EstadisticaPartido(Base):
    __tablename__ = "estadisticas_partido"
    __table_args__ = (UniqueConstraint("partido_id", "jugador_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False)
    jugador_id: Mapped[int] = mapped_column(ForeignKey("jugadores.id"), nullable=False)

    libres_conv: Mapped[int] = mapped_column(SmallInteger, default=0)
    libres_int: Mapped[int] = mapped_column(SmallInteger, default=0)
    dobles_conv: Mapped[int] = mapped_column(SmallInteger, default=0)
    dobles_int: Mapped[int] = mapped_column(SmallInteger, default=0)
    triples_conv: Mapped[int] = mapped_column(SmallInteger, default=0)
    triples_int: Mapped[int] = mapped_column(SmallInteger, default=0)

    asistencias: Mapped[int] = mapped_column(SmallInteger, default=0)
    reb_ofensivos: Mapped[int] = mapped_column(SmallInteger, default=0)
    reb_defensivos: Mapped[int] = mapped_column(SmallInteger, default=0)
    faltas_personales: Mapped[int] = mapped_column(SmallInteger, default=0)
    faltas_recibidas: Mapped[int] = mapped_column(SmallInteger, default=0)
    faltas_tecnicas: Mapped[int] = mapped_column(SmallInteger, default=0)
    faltas_antideportivas: Mapped[int] = mapped_column(SmallInteger, default=0)
    perdidas: Mapped[int] = mapped_column(SmallInteger, default=0)
    bloqueos: Mapped[int] = mapped_column(SmallInteger, default=0)
    recuperos: Mapped[int] = mapped_column(SmallInteger, default=0)

    partido: Mapped["Partido"] = relationship(back_populates="estadisticas")
    jugador: Mapped["Jugador"] = relationship(back_populates="estadisticas")