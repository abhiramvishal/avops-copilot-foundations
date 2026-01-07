# api/services/llm_client.py
from __future__ import annotations

import os
import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")


def call_llm(system: str, user: str, model: str | None = None, timeout: int = 60) -> str:
    """
    Calls Ollama /api/chat and returns assistant message content.

    Env:
      - OLLAMA_URL (default http://localhost:11434)
      - OLLAMA_MODEL (default llama3.1)
    """
    model_name = model or OLLAMA_MODEL

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        # Optional: to make JSON-only output more reliable
        "options": {
            "temperature": 0.2,
        },
    }

    r = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=timeout)
    r.raise_for_status()

    data = r.json()

    # Ollama returns: {"message": {"role": "assistant", "content": "..."}}
    msg = data.get("message") or {}
    content = msg.get("content")

    if not isinstance(content, str):
        raise RuntimeError(f"Unexpected Ollama response format: {data}")

    return content.strip()
