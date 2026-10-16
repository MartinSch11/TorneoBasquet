from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.usuario import utcnow


class Cancha(Base):
    __tablename__ = "canchas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    direccion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ciudad: Mapped[str | None] = mapped_column(String(100), default="Córdoba", nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notas: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
