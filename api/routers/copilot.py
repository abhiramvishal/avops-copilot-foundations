from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.core.auth_deps import get_current_user
from api.db.deps import get_db
from api.db.models import CopilotRun, User
from api.schemas.copilot import (
    CopilotRunRequest,
    CopilotRunResponse,
    CopilotRunListResponse,
)
from api.services.copilot_service import run_copilot_task

router = APIRouter(prefix="/copilot", tags=["copilot"])


def _to_response(run: CopilotRun) -> dict:
    return {
        "run_id": run.id,
        "status": run.status,
        "task": run.task,
        "input_context": run.input_context or {},
        "output": run.output or {},
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }


@router.post("/run", response_model=CopilotRunResponse)
def copilot_run(
    payload: CopilotRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = run_copilot_task(db, current_user, payload.task)
    return _to_response(run)


@router.get("/runs", response_model=CopilotRunListResponse)
def list_copilot_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    runs = (
        db.query(CopilotRun)
        .filter(CopilotRun.user_id == current_user.id)
        .order_by(CopilotRun.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {"items": [_to_response(r) for r in runs]}


@router.get("/runs/{run_id}", response_model=CopilotRunResponse)
def get_copilot_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    run = (
        db.query(CopilotRun)
        .filter(CopilotRun.id == run_id, CopilotRun.user_id == current_user.id)
        .first()
    )

    if not run:
        raise HTTPException(status_code=404, detail="Copilot run not found")

    return _to_response(run)
