from datetime import datetime
from fastapi import APIRouter

router = APIRouter(prefix="/device", tags=["device"])


@router.post("/reset")
def reset_device(device_id: str):
    return {
        "device_id": device_id,
        "action": "reset_triggered",
        "status": "simulated",
        "timestamp": datetime.utcnow().isoformat(),
    }
