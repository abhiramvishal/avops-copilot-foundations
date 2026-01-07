from datetime import datetime
from typing import Dict

from fastapi import APIRouter

from api.schemas.telemetry import TelemetryPayload

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

# In-memory storage (demo)
telemetry_store: Dict[str, Dict] = {}


@router.post("/ingest")
def ingest_telemetry(payload: TelemetryPayload):
    telemetry_store[payload.device_id] = {
        "data": payload.model_dump(),
        "timestamp": datetime.utcnow().isoformat(),
    }
    return {"message": "Telemetry ingested", "device_id": payload.device_id}


@router.get("/latest")
def get_latest_telemetry():
    return telemetry_store
