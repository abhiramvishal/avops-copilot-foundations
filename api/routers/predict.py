from fastapi import APIRouter

from api.schemas.telemetry import TelemetryPayload, RiskResponse
from api.services.risk import compute_risk

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/risk", response_model=RiskResponse)
def predict_risk(payload: TelemetryPayload):
    return compute_risk(payload)
