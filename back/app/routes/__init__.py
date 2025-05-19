"""API маршруты приложения"""

from fastapi import APIRouter

from app.routes import (
    auth,
    sensors,
    devices,
    fertilizer,
    calibration,
    diagnostic,
    settings,
    reports,
    irrigation,
)

# Создание главного роутера
api_router = APIRouter()

# Подключение роутеров
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["sensors"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(fertilizer.router, prefix="/fertilizer", tags=["fertilizer"])
api_router.include_router(
    calibration.router, prefix="/calibration", tags=["calibration"]
)
api_router.include_router(diagnostic.router, prefix="/diagnostic", tags=["diagnostic"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(irrigation.router, prefix="/irrigation", tags=["irrigation"])

# Создание роутера для API
router = APIRouter()

# Подключение API роутера к основному роутеру
router.include_router(api_router, prefix="/api")
