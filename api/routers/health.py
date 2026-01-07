from datetime import datetime
from fastapi import APIRouter, Response

router = APIRouter(tags=["health"])


@router.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@router.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.get("/")
def root():
    return {
        "service": "AVOps Copilot",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
    }
