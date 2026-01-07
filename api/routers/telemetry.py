from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.db.deps import get_db
from api.schemas.telemetry import TelemetryPayload
from api.services.telemetry_store import save_telemetry_event

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# In-memory storage (demo)
telemetry_store: Dict[str, Dict] = {}


@router.post("/ingest")
def ingest_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db)):
    # 1) keep the in-memory store for quick demo reads
    telemetry_store[payload.device_id] = {
        "data": payload.model_dump(),
        "timestamp": datetime.utcnow().isoformat(),
    }

    # 2) also persist to DB
    saved = save_telemetry_event(db, payload)

    return {
        "message": "Telemetry ingested",
        "device_id": payload.device_id,
        "event_id": saved.id,
    }


@router.get("/latest")
def get_latest_telemetry():
    return telemetry_store

@router.get("/latest/{device_id}")
def get_latest_for_device(device_id: str, db: Session = Depends(get_db)):
    row = (
        db.query(__import__("api.db.models").db.models.TelemetryEvent)
        .filter_by(device_id=device_id)
        .order_by(__import__("api.db.models").db.models.TelemetryEvent.id.desc())
        .first()
    )

    if not row:
        return {"device_id": device_id, "latest": None}

    return {
        "device_id": device_id,
        "latest": {
            "id": row.id,
            "temperature": row.temperature,
            "packet_loss": row.packet_loss,
            "audio_dropouts": row.audio_dropouts,
            "error_code": row.error_code,
            "created_at": row.created_at.isoformat(),
        },
    }