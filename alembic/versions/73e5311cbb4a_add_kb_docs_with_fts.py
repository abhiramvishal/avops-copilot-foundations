from alembic import op
import sqlalchemy as sa

revision = "xxxx"
down_revision = "a129a5eb5108"

def upgrade():
    op.create_table(
        "kb_docs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("source", sa.Text, nullable=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    # FTS virtual table
    op.execute("""
    CREATE VIRTUAL TABLE kb_docs_fts USING fts5(
        title, content, content='kb_docs', content_rowid='id'
    );
    """)

    # Triggers to keep FTS in sync
    op.execute("""
    CREATE TRIGGER kb_docs_ai AFTER INSERT ON kb_docs BEGIN
      INSERT INTO kb_docs_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
    """)
    op.execute("""
    CREATE TRIGGER kb_docs_ad AFTER DELETE ON kb_docs BEGIN
      INSERT INTO kb_docs_fts(kb_docs_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
    END;
    """)
    op.execute("""
    CREATE TRIGGER kb_docs_au AFTER UPDATE ON kb_docs BEGIN
      INSERT INTO kb_docs_fts(kb_docs_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
      INSERT INTO kb_docs_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
    END;
    """)

def downgrade():
    op.execute("DROP TRIGGER IF EXISTS kb_docs_au;")
    op.execute("DROP TRIGGER IF EXISTS kb_docs_ad;")
    op.execute("DROP TRIGGER IF EXISTS kb_docs_ai;")
    op.execute("DROP TABLE IF EXISTS kb_docs_fts;")
    op.drop_table("kb_docs")
