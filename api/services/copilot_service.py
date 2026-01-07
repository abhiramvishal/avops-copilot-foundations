from datetime import datetime
from sqlalchemy.orm import Session

from api.db.models import CopilotRun, TelemetryEvent, User

def run_copilot_task(db: Session, user: User, task: str) -> CopilotRun:
    # naive device extraction for now
    device_id = None
    for token in task.replace(",", " ").split():
        if token.lower().startswith("device-") or token.isdigit():
            device_id = token
            break

    latest = None
    if device_id:
        latest = (
            db.query(TelemetryEvent)
            .filter(TelemetryEvent.device_id == device_id)
            .order_by(TelemetryEvent.id.desc())
            .first()
        )

    diagnosis = []
    next_steps = []

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

    run = CopilotRun(
        user_id=user.id,
        task=task,
        input_context={
            "device_id": device_id,
            "latest_telemetry": None if not latest else {
                "id": latest.id,
                "device_id": latest.device_id,
                "temperature": latest.temperature,
                "packet_loss": latest.packet_loss,
                "audio_dropouts": latest.audio_dropouts,
                "error_code": latest.error_code,
                "created_at": latest.created_at.isoformat() if latest.created_at else None,
            },
        },
        output={
            "diagnosis": diagnosis,
            "next_steps": next_steps,
            "generated_at": datetime.utcnow().isoformat(),
        },
        status="success",
    )

    db.add(run)
    db.commit()
    db.refresh(run)
    return run
