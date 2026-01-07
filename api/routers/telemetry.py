from datetime import datetime
from typing import Dict
from sqlalchemy.orm import Session

from api.db.deps import get_db
from api.schemas.telemetry import TelemetryPayload
from api.services.telemetry_store import save_telemetry_event

from fastapi import APIRouter, Depends, HTTPException, Query

from api.core.auth_deps import get_current_user
from api.db.models import TelemetryEvent, User
from api.schemas.telemetry import TelemetryEventListResponse, TelemetryEventResponse


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


@router.get("/events", response_model=TelemetryEventListResponse)
def list_telemetry_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    device_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(TelemetryEvent)
    if device_id:
        q = q.filter(TelemetryEvent.device_id == device_id)

    rows = (
        q.order_by(TelemetryEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {"items": rows}


@router.get("/events/{event_id}", response_model=TelemetryEventResponse)
def get_telemetry_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(TelemetryEvent).filter(TelemetryEvent.id == event_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Telemetry event not found")
    return row
