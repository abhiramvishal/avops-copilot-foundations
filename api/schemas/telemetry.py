from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TelemetryPayload(BaseModel):
    device_id: str
    temperature: float
    packet_loss: float
    audio_dropouts: int
    error_code: str | None = None

class RiskResponse(BaseModel):
    device_id: str
    risk_score: float
    reason: str
    timestamp: str

class TelemetryEventResponse(BaseModel):
    id: int
    device_id: str
    temperature: int
    packet_loss: int
    audio_dropouts: int
    error_code: Optional[str] = None
    created_at: datetime

class TelemetryEventListResponse(BaseModel):
    items: List[TelemetryEventResponse]
