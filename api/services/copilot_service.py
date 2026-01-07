from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, Optional, List

from sqlalchemy.orm import Session

from api.db.models import CopilotRun, TelemetryEvent, User
from api.services.retrieval import retrieve_kb
from api.services.llm_client import call_llm


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL | re.IGNORECASE)


def _extract_device_id(task: str) -> Optional[str]:
    """
    Very naive device extraction:
    - finds token starting with 'device-'
    - or a standalone number token
    Strips punctuation like commas/periods.
    """
    for raw in task.replace(",", " ").split():
        t = raw.strip().strip("()[]{}<>\"'.,;:")  # trim punctuation around token
        if not t:
            continue
        if t.lower().startswith("device-") or t.isdigit():
            return t
    return None


def _try_parse_llm_json(text: str) -> Optional[Dict[str, Any]]:
    """
    Try hard to parse LLM output as JSON dict:
    - handles ```json { ... } ``` fences
    - handles extra text before/after JSON by extracting the first {...} block
    """
    if not text:
        return None

    s = text.strip()

    # 1) code fence JSON
    m = _JSON_FENCE_RE.search(s)
    if m:
        candidate = m.group(1).strip()
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) else None
        except Exception:
            pass

    # 2) try direct json
    try:
        obj = json.loads(s)
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass

    # 3) extract first {...} span (best-effort)
    first = s.find("{")
    last = s.rfind("}")
    if first != -1 and last != -1 and last > first:
        candidate = s[first : last + 1].strip()
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) else None
        except Exception:
            return None

    return None


def run_copilot_task(db: Session, user: User, task: str) -> CopilotRun:
    # 1) extract device id and get latest telemetry
    device_id = _extract_device_id(task)

    latest: Optional[TelemetryEvent] = None
    if device_id:
        latest = (
            db.query(TelemetryEvent)
            .filter(TelemetryEvent.device_id == device_id)
            .order_by(TelemetryEvent.id.desc())
            .first()
        )

    # 2) rule-based baseline (works even if LLM fails)
    diagnosis: List[str] = []
    next_steps: List[str] = []

    if latest:
        if latest.audio_dropouts > 3:
            diagnosis.append("Audio dropouts are frequent.")
            next_steps.append("Check audio cable integrity / connectors.")
            next_steps.append("Inspect DSP / audio interface logs.")

        if latest.packet_loss > 5:
            diagnosis.append("Packet loss is elevated.")
            next_steps.append("Run network ping/jitter test and check switch ports.")

        if latest.temperature > 70:
            diagnosis.append("Device temperature is high.")
            next_steps.append("Ensure ventilation, check fan status, reduce load.")

        if not diagnosis:
            diagnosis.append("No obvious anomalies from latest telemetry.")
            next_steps.append("Monitor over time and compare against baseline.")
    else:
        diagnosis.append("No telemetry found for referenced device.")
        next_steps.append("Ingest telemetry first, then rerun diagnosis.")

    # 3) retrieval hits (best-effort)
    kb_query = f"{task} {latest.error_code if latest and latest.error_code else ''}".strip()
    kb_hits: List[dict] = []
    try:
        kb_hits = retrieve_kb(db, kb_query, k=5) or []
    except Exception:
        kb_hits = []

    # 4) build prompts
    system_prompt = (
        "You are an AV operations copilot.\n"
        "Return ONLY valid JSON with keys:\n"
        "diagnosis: array of strings\n"
        "next_steps: array of strings\n"
        "notes: string\n"
        "Be concise, technical, and consistent with given telemetry and KB snippets."
    )

    user_prompt_obj: Dict[str, Any] = {
        "task": task,
        "telemetry": None
        if not latest
        else {
            "device_id": latest.device_id,
            "temperature": latest.temperature,
            "packet_loss": latest.packet_loss,
            "audio_dropouts": latest.audio_dropouts,
            "error_code": latest.error_code,
            "created_at": latest.created_at.isoformat() if latest.created_at else None,
        },
        "rule_based": {"diagnosis": diagnosis, "next_steps": next_steps},
        "kb_snippets": kb_hits,
    }

    # 5) call LLM (best-effort) and validate JSON
    llm_output: Optional[Dict[str, Any]] = None
    llm_raw: Optional[str] = None

    try:
        llm_raw = call_llm(system_prompt, json.dumps(user_prompt_obj, ensure_ascii=False))
        llm_parsed = _try_parse_llm_json(llm_raw)

        if isinstance(llm_parsed, dict):
            d = llm_parsed.get("diagnosis")
            n = llm_parsed.get("next_steps")
            if isinstance(d, list) and isinstance(n, list):
                llm_output = {
                    "diagnosis": [str(x) for x in d],
                    "next_steps": [str(x) for x in n],
                    "notes": str(llm_parsed.get("notes", "")).strip(),
                }
    except Exception as e:
        print("LLM ERROR:", repr(e))
        llm_output = None

    # 6) final output stored in DB
    final_output: Dict[str, Any]
    if llm_output:
        final_output = {
            **llm_output,
            "generated_at": datetime.utcnow().isoformat(),
            "used_retrieval": bool(kb_hits),
            "sources": kb_hits,  # keeps demo explainable
        }
    else:
        final_output = {
            "diagnosis": diagnosis,
            "next_steps": next_steps,
            "notes": "rule-based fallback (LLM unavailable or invalid JSON).",
            "generated_at": datetime.utcnow().isoformat(),
            "used_retrieval": bool(kb_hits),
            "sources": kb_hits,
        }

    # 7) persist CopilotRun
    # IMPORTANT: set created_at explicitly to avoid SQLite NOT NULL default issues
    run = CopilotRun(
        user_id=user.id,
        task=task,
        input_context={
            "device_id": device_id,
            "latest_telemetry": None
            if not latest
            else {
                "id": latest.id,
                "device_id": latest.device_id,
                "temperature": latest.temperature,
                "packet_loss": latest.packet_loss,
                "audio_dropouts": latest.audio_dropouts,
                "error_code": latest.error_code,
                "created_at": latest.created_at.isoformat() if latest.created_at else None,
            },
        },
        output=final_output,
        status="success",
        created_at=datetime.utcnow(),
    )

    db.add(run)
    db.commit()
    db.refresh(run)
    return run
