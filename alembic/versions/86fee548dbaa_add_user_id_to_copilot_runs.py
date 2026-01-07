"""add user_id to copilot_runs

Revision ID: 86fee548dbaa
Revises: 9e63e8b88f81
Create Date: 2026-01-07 23:15:43.254353

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '86fee548dbaa'
down_revision: Union[str, Sequence[str], None] = '9e63e8b88f81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _index_exists(conn, index_name: str) -> bool:
    rows = conn.execute(sa.text("PRAGMA index_list('copilot_runs')")).fetchall()
    return any(r[1] == index_name for r in rows)  # r[1] is index name


def upgrade() -> None:
    conn = op.get_bind()

    # Add column if missing
    cols = conn.execute(sa.text("PRAGMA table_info('copilot_runs')")).fetchall()
    col_names = {c[1] for c in cols}  # c[1] is column name

    with op.batch_alter_table("copilot_runs") as batch_op:
        if "user_id" not in col_names:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))

    # Create index if missing
    if not _index_exists(conn, "ix_copilot_runs_user_id"):
        op.create_index("ix_copilot_runs_user_id", "copilot_runs", ["user_id"], unique=False)

    # Backfill NULLs
    op.execute("UPDATE copilot_runs SET user_id = 1 WHERE user_id IS NULL")

    # Add FK + set NOT NULL via batch mode
    with op.batch_alter_table("copilot_runs") as batch_op:
        # create_foreign_key inside batch is safe in sqlite
        batch_op.create_foreign_key(
            "fk_copilot_runs_user_id_users",
            "users",
            ["user_id"],
            ["id"],
        )
        batch_op.alter_column("user_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("copilot_runs") as batch_op:
        batch_op.drop_constraint("fk_copilot_runs_user_id_users", type_="foreignkey")
        batch_op.drop_column("user_id")

    op.drop_index("ix_copilot_runs_user_id", table_name="copilot_runs")


