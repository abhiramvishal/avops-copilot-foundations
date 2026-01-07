from datetime import datetime
from typing import List

from api.schemas.telemetry import TelemetryPayload, RiskResponse


def compute_risk(payload: TelemetryPayload) -> RiskResponse:
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
        timestamp=datetime.utcnow().isoformat(),
    )
