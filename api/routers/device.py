from datetime import datetime
from fastapi import APIRouter, Depends

from api.core.auth_deps import get_current_user
from api.db.models import User


router = APIRouter(prefix="/device", tags=["device"])

@router.post("/reset")
def reset_device(device_id: str, current_user: User = Depends(get_current_user)):
    return {
        "device_id": device_id,
        "action": "reset_triggered",
        "status": "simulated",
        "timestamp": datetime.utcnow().isoformat(),
    }
