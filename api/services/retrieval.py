# api/services/retrieval.py
from __future__ import annotations

import re
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text


_WORD_RE = re.compile(r"[A-Za-z0-9_]+")


def _to_fts_query(q: str) -> str:
    """
    Convert user text into a simple FTS5 query:
    - extracts alnum tokens
    - uses prefix search token*
    - joins with AND
    Example: "device-001 E42 audio dropouts" -> "device* AND 001* AND E42* AND audio* AND dropouts*"
    """
    tokens = _WORD_RE.findall(q or "")
    tokens = [t for t in tokens if t]
    if not tokens:
        return ""
    return " AND ".join([f"{t}*" for t in tokens])


def retrieve_kb(db: Session, query: str, k: int = 5) -> List[Dict[str, Any]]:
    fts_q = _to_fts_query(query)
    if not fts_q:
        return []

    sql = text(
        """
        SELECT d.id, d.title, d.source,
               snippet(kb_docs_fts, 1, '[', ']', '...', 12) AS snippet
        FROM kb_docs_fts
        JOIN kb_docs d ON d.id = kb_docs_fts.rowid
        WHERE kb_docs_fts MATCH :q
        LIMIT :k
        """
    )

    try:
        rows = db.execute(sql, {"q": fts_q, "k": int(k)}).fetchall()
    except Exception:
        # If FTS table isn't created yet or query fails, don't crash the whole copilot
        return []

    return [
        {"id": r[0], "title": r[1], "source": r[2], "snippet": r[3]}
        for r in rows
    ]
