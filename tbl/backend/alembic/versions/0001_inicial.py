"""inicial: creacion de todas las tablas

Revision ID: 0001
Revises:
Create Date: 2026-09-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("usuario", sa.String(50), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.String(20), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "sponsors",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=False),
        sa.Column("url_sitio", sa.String(500), nullable=True),
        sa.Column("orden", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    op.create_table(
        "torneos",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("edicion", sa.Integer(), nullable=False),
        sa.Column("categoria", sa.String(50), nullable=False),
        sa.Column("grupo", sa.String(20), nullable=True),
        sa.Column("temporada", sa.String(10), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
    )

    op.create_table(
        "equipos",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("nombre", sa.String(100), unique=True, nullable=False),
        sa.Column("escudo_url", sa.String(500), nullable=True),
    )

    op.create_table(
        "inscripciones",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("equipo_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.UniqueConstraint("torneo_id", "equipo_id"),
    )

    op.create_table(
        "jugadores",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("apellido", sa.String(100), nullable=False),
        sa.Column("foto_url", sa.String(500), nullable=True),
        sa.Column("equipo_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    op.create_table(
        "fechas",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("numero", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.String(100), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
    )

    op.create_table(
        "partidos",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("fecha_id", sa.Integer(), sa.ForeignKey("fechas.id"), nullable=False),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("equipo_local_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.Column("equipo_visitante_id", sa.Integer(), sa.ForeignKey("equipos.id"), nullable=False),
        sa.Column("pts_local", sa.Integer(), nullable=True),
        sa.Column("pts_visitante", sa.Integer(), nullable=True),
        sa.Column(
            "fase",
            sa.String(50),
            server_default="RONDA REGULAR",
            nullable=False,
        ),
        sa.Column("horario", sa.Time(), nullable=True),
        sa.Column("cancha", sa.String(100), nullable=True),
        sa.Column("jugado", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    op.create_table(
        "estadisticas_partido",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("jugador_id", sa.Integer(), sa.ForeignKey("jugadores.id"), nullable=False),
        sa.Column("libres_conv", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("libres_int", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("dobles_conv", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("dobles_int", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("triples_conv", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("triples_int", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("asistencias", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("reb_ofensivos", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("reb_defensivos", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("faltas_personales", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("faltas_recibidas", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("perdidas", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("bloqueos", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("recuperos", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.UniqueConstraint("partido_id", "jugador_id"),
    )

    op.create_table(
        "albumes",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("subido_por", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
    )

    op.create_table(
        "fotos",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("album_id", sa.Integer(), sa.ForeignKey("albumes.id"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=True),
        sa.Column("orden", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("subido_por", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("fotos")
    op.drop_table("albumes")
    op.drop_table("estadisticas_partido")
    op.drop_table("partidos")
    op.drop_table("fechas")
    op.drop_table("jugadores")
    op.drop_table("inscripciones")
    op.drop_table("equipos")
    op.drop_table("torneos")
    op.drop_table("sponsors")
    op.drop_table("usuarios")