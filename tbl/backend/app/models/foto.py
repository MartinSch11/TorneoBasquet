from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.usuario import utcnow


class Foto(Base):
    __tablename__ = "fotos"

    id: Mapped[int] = mapped_column(primary_key=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("albumes.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    titulo: Mapped[str | None] = mapped_column(String(200), nullable=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)
    subido_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    album: Mapped["Album"] = relationship(back_populates="fotos")