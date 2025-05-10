from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, Body
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
    """
    Get system settings.

    Only accessible by administrators.
    """
    # In a real application, these would be stored in a database or config file
    # For now, we return hardcoded values
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
    """
    Update system settings.

    Only accessible by administrators.
    """
    # In a real application, these would be stored in a database or config file
    # For now, we just log the update
    logger.info(f"System settings updated by user {current_user.username}")
    logger.debug(f"New settings: {settings}")

    return {
        "status": "success",
        "message": "System settings updated successfully",
        "data": settings,
    }


@router.get("/user-preferences", response_model=Dict[str, Any])
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
):
    """
    Get user preferences for the current user.
    """
    # In a real application, these would be stored in a database
    # For now, we return hardcoded values
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
    """
    Update preferences for the current user.
    """
    # In a real application, these would be stored in a database
    # For now, we just log the update
    logger.info(f"User preferences updated for user {current_user.username}")
    logger.debug(f"New preferences: {preferences}")

    return {
        "status": "success",
        "message": "User preferences updated successfully",
        "data": preferences,
    }


@router.get("/units", response_model=Dict[str, List[str]])
async def get_unit_settings(
    current_user: User = Depends(get_current_user),
):
    """
    Get available unit settings for different measurement types.
    """
    # Define available units for each measurement type
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
    """
    Get notification settings for the current user.
    """
    # In a real application, these would be stored in a database
    # For now, we return hardcoded values
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
    """
    Update notification settings for the current user.
    """
    # In a real application, these would be stored in a database
    # For now, we just log the update
    logger.info(f"Notification settings updated for user {current_user.username}")
    logger.debug(f"New notification settings: {settings}")

    return {
        "status": "success",
        "message": "Notification settings updated successfully",
        "data": settings,
    }
