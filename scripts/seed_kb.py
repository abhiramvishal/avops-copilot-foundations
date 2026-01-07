import sqlite3
from datetime import datetime

DB_PATH = "avops.db"

docs = [
    (
        "Audio dropouts on Dante-enabled devices",
        "AV Ops Handbook",
        """
Frequent audio dropouts on Dante devices are often caused by:
- Clock sync mismatch
- Faulty Ethernet cables
- Switch QoS misconfiguration
Recommended actions:
- Verify master clock
- Replace Cat6 cables
- Enable QoS and IGMP snooping
"""
    ),
    (
        "Packet loss troubleshooting for AV networks",
        "Network Ops Guide",
        """
Packet loss above 5% can severely impact real-time AV streams.
Common causes include:
- Congested switch ports
- Duplex mismatches
- Broadcast storms
Resolution steps:
- Check interface statistics
- Run continuous ping and jitter tests
- Isolate AV VLAN
"""
    ),
    (
        "High temperature alerts on AV processors",
        "Vendor KB",
        """
Temperatures above 70°C may indicate:
- Fan failure
- Blocked ventilation
- Excessive DSP load
Immediate actions:
- Inspect cooling fans
- Improve airflow
- Reduce processing load
"""
    ),
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

for title, source, content in docs:
    cur.execute(
        "INSERT INTO kb_docs (title, source, content, created_at) VALUES (?, ?, ?, ?)",
        (title, source, content.strip(), datetime.utcnow()),
    )

conn.commit()

# Sync to FTS
cur.execute("""
INSERT INTO kb_docs_fts(rowid, content)
SELECT id, content FROM kb_docs
WHERE id NOT IN (SELECT rowid FROM kb_docs_fts);
""")

conn.commit()
conn.close()

print("✅ KB seeded + FTS updated")
