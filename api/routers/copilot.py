from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.core.auth_deps import get_current_user
from api.db.deps import get_db
from api.db.models import User
from api.schemas.copilot import CopilotRunRequest, CopilotRunResponse
from api.services.copilot_service import run_copilot_task

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/run", response_model=CopilotRunResponse)
def copilot_run(payload: CopilotRunRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = run_copilot_task(db, current_user, payload.task)
    return {
        "run_id": run.id,
        "status": run.status,
        "task": run.task,
        "input_context": run.input_context or {},
        "output": run.output or {},
        "created_at": run.created_at,
    }

