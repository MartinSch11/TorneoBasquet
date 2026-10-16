"""agregar faltas tecnicas y antideportivas a estadisticas_partido

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "estadisticas_partido",
        sa.Column(
            "faltas_tecnicas",
            sa.SmallInteger(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.add_column(
        "estadisticas_partido",
        sa.Column(
            "faltas_antideportivas",
            sa.SmallInteger(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("estadisticas_partido", "faltas_antideportivas")
    op.drop_column("estadisticas_partido", "faltas_tecnicas")