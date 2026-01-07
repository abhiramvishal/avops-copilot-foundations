import sqlite3

DB_PATH = "avops.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Enable FTS5 (usually already enabled)
cur.execute("PRAGMA foreign_keys=ON;")

# Create FTS table
cur.execute("""
CREATE VIRTUAL TABLE IF NOT EXISTS kb_docs_fts
USING fts5(
    content,
    content='kb_docs',
    content_rowid='id'
);
""")

# Backfill existing KB docs
cur.execute("""
INSERT INTO kb_docs_fts(rowid, content)
SELECT id, content FROM kb_docs
WHERE id NOT IN (SELECT rowid FROM kb_docs_fts);
""")

conn.commit()
conn.close()

print("✅ kb_docs_fts created and backfilled")
