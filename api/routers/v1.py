from fastapi import APIRouter

from api.routers.telemetry import router as telemetry_router
from api.routers.predict import router as predict_router
from api.routers.device import router as device_router
from api.routers.auth import router as auth_router
from api.routers.copilot import router as copilot_router

router = APIRouter(prefix="/api/v1")

router.include_router(telemetry_router)
router.include_router(predict_router)
router.include_router(device_router)
router.include_router(auth_router)

router.include_router(copilot_router)
