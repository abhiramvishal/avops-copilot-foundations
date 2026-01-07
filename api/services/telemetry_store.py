from sqlalchemy.orm import Session

from api.db.models import TelemetryEvent
from api.schemas.telemetry import TelemetryPayload


def save_telemetry_event(db: Session, payload: TelemetryPayload) -> TelemetryEvent:
    row = TelemetryEvent(
        device_id=payload.device_id,
        temperature=int(payload.temperature),
        packet_loss=int(payload.packet_loss),
        audio_dropouts=int(payload.audio_dropouts),
        error_code=payload.error_code,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
