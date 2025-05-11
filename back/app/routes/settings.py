from typing import Dict, Any, List

from fastapi import APIRouter, Depends, Body
from loguru import logger

from app.deps.auth import get_current_user, get_admin_user
from app.models.user import User
from app.schemas.common import SuccessResponse

# Create settings router
router = APIRouter()


@router.get("/system", response_model=Dict[str, Any])
async def get_system_settings(
    current_user: User = Depends(get_admin_user),
):
    """Получение системных настроек. Доступно только администраторам."""
    return {
        "app_name": "VineGuard",
        "app_version": "0.1.0",
        "max_upload_size_mb": 10,
        "allowed_file_types": ["jpg", "png", "pdf", "csv", "xlsx"],
        "default_language": "en",
        "timezone": "UTC",
        "data_retention_days": 365,
        "sensor_polling_interval_seconds": 300,
        "notifications": {
            "email_alerts_enabled": True,
            "push_notifications_enabled": True,
            "sms_alerts_enabled": False,
        },
        "maintenance": {
            "scheduled": False,
            "start_time": None,
            "end_time": None,
            "message": None,
        },
    }


@router.patch("/system", response_model=SuccessResponse)
async def update_system_settings(
    settings: Dict[str, Any] = Body(...), current_user: User = Depends(get_admin_user)
):
    """Обновление системных настроек. Доступно только администраторам."""
    logger.info(f"Системные настройки обновлены пользователем {current_user.username}")
    logger.debug(f"Новые настройки: {settings}")

    return {
        "status": "success",
        "message": "Системные настройки успешно обновлены",
        "data": settings,
    }


@router.get("/user-preferences", response_model=Dict[str, Any])
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
):
    """Получение пользовательских настроек для текущего пользователя."""
    return {
        "theme": "light",
        "dashboard_layout": "default",
        "notifications_enabled": True,
        "email_notifications": True,
        "language": "en",
        "timezone": "UTC",
        "date_format": "YYYY-MM-DD",
        "time_format": "24h",
        "items_per_page": 20,
    }


@router.patch("/user-preferences", response_model=SuccessResponse)
async def update_user_preferences(
    preferences: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
):
    """Обновление пользовательских настроек для текущего пользователя."""
    logger.info(f"Настройки пользователя обновлены для {current_user.username}")
    logger.debug(f"Новые настройки: {preferences}")

    return {
        "status": "success",
        "message": "Пользовательские настройки успешно обновлены",
        "data": preferences,
    }


@router.get("/units", response_model=Dict[str, List[str]])
async def get_unit_settings(
    current_user: User = Depends(get_current_user),
):
    """Получение доступных единиц измерения для разных типов измерений."""
    return {
        "temperature": ["°C", "°F", "K"],
        "length": ["m", "cm", "mm", "in", "ft"],
        "area": ["m²", "ha", "acre", "ft²"],
        "volume": ["L", "mL", "m³", "gal"],
        "weight": ["kg", "g", "lb", "oz"],
        "speed": ["m/s", "km/h", "mph"],
        "pressure": ["hPa", "kPa", "psi"],
        "humidity": ["%"],
        "soil_moisture": ["%", "kPa"],
        "ph": ["pH"],
        "electrical_conductivity": ["mS/cm", "dS/m"],
        "light": ["lux", "µmol/(m²·s)"],
        "concentration": ["ppm", "mg/L", "%"],
    }


@router.get("/notifications", response_model=Dict[str, Any])
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
):
    """Получение настроек уведомлений для текущего пользователя."""
    return {
        "email": {
            "enabled": True,
            "frequency": "immediate",
            "types": ["alerts", "reports", "system_notifications"],
        },
        "push": {
            "enabled": True,
            "types": ["alerts", "system_notifications"],
        },
        "sms": {
            "enabled": False,
            "types": ["alerts"],
        },
        "alert_thresholds": {
            "severity_level": "medium",  # low, medium, high, critical
        },
    }


@router.patch("/notifications", response_model=SuccessResponse)
async def update_notification_settings(
    settings: Dict[str, Any] = Body(...), current_user: User = Depends(get_current_user)
):
    """Обновление настроек уведомлений для текущего пользователя."""
    logger.info(
        f"Настройки уведомлений обновлены для пользователя {current_user.username}"
    )
    logger.debug(f"Новые настройки уведомлений: {settings}")

    return {
        "status": "success",
        "message": "Настройки уведомлений успешно обновлены",
        "data": settings,
    }
