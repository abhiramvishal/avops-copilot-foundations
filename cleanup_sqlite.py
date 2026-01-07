import sqlite3

conn = sqlite3.connect("avops.db")
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS _alembic_tmp_copilot_runs")
cur.execute("DROP INDEX IF EXISTS ix_copilot_runs_user_id")

conn.commit()
conn.close()

print("Cleanup done")
