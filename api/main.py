from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime

app = FastAPI(
    title="AVOps Copilot – Internal AI Tooling (Foundations)",
    description="Internal AI tooling for AV telemetry, predictive maintenance, and diagnostics.",
    version="0.1.0"
)

# -----------------------------
# In-memory storage (for demo)
# -----------------------------
telemetry_store: Dict[str, Dict] = {}


# -----------------------------
# Data Models
# -----------------------------
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


# -----------------------------
# Health Check
# -----------------------------
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)  # No Content

@app.get("/")
def root():
    return {
        "service": "AVOps Copilot",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


# -----------------------------
# Telemetry Ingest
# -----------------------------
@app.post("/telemetry/ingest")
def ingest_telemetry(payload: TelemetryPayload):
    telemetry_store[payload.device_id] = {
        "data": payload.dict(),
        "timestamp": datetime.utcnow().isoformat()
    }
    return {
        "message": "Telemetry ingested",
        "device_id": payload.device_id
    }


# -----------------------------
# View Latest Telemetry
# -----------------------------
@app.get("/telemetry/latest")
def get_latest_telemetry():
    return telemetry_store


# -----------------------------
# Predictive Maintenance (Rule-based for foundation)
# -----------------------------
@app.post("/predict/risk", response_model=RiskResponse)
def predict_risk(payload: TelemetryPayload):
    risk_score = 0.0
    reasons: List[str] = []

    if payload.temperature > 70:
        risk_score += 0.4
        reasons.append("High device temperature")

    if payload.packet_loss > 5:
        risk_score += 0.3
        reasons.append("Elevated packet loss")

    if payload.audio_dropouts > 3:
        risk_score += 0.2
        reasons.append("Frequent audio dropouts")

    if payload.error_code:
        risk_score += 0.1
        reasons.append(f"Error code reported: {payload.error_code}")

    risk_score = min(risk_score, 1.0)

    return RiskResponse(
        device_id=payload.device_id,
        risk_score=round(risk_score, 2),
        reason=", ".join(reasons) if reasons else "Device operating within normal parameters",
        timestamp=datetime.utcnow().isoformat()
    )


# -----------------------------
# Simulated Device Reset
# -----------------------------
@app.post("/device/reset")
def reset_device(device_id: str):
    return {
        "device_id": device_id,
        "action": "reset_triggered",
        "status": "simulated",
        "timestamp": datetime.utcnow().isoformat()
    }
