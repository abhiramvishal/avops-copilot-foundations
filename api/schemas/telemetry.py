from pydantic import BaseModel

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
