"""add copilot_run input_context and output

Revision ID: a129a5eb5108
Revises: 86fee548dbaa
Create Date: 2026-01-07 23:30:23.050146

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a129a5eb5108'
down_revision: Union[str, Sequence[str], None] = '86fee548dbaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # SQLite needs defaults for NOT NULL columns when table already has rows.
    with op.batch_alter_table("copilot_runs", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "input_context",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'{}'"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "output",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'{}'"),
            )
        )

        # drop the old string column (autogen detected this)
        batch_op.drop_column("result")


def downgrade() -> None:
    with op.batch_alter_table("copilot_runs", recreate="always") as batch_op:
        batch_op.add_column(sa.Column("result", sa.TEXT(), nullable=False, server_default=""))
        batch_op.drop_column("output")
        batch_op.drop_column("input_context")
