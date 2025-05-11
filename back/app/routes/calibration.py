from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path

from app.deps.auth import get_current_user
from app.models.user import User
from app.models.sensor_data import SensorType
from app.services.calibration import (
    start_sensor_calibration,
    get_calibration_status,
    get_all_calibrations,
    reset_calibration,
)

router = APIRouter()


@router.post("/{sensor_id}/start", response_model=Dict[str, Any])
async def start_calibration(
    sensor_id: str = Path(..., description="ID датчика для калибровки"),
    sensor_type: Optional[SensorType] = Query(
        None, description="Тип датчика (опционально)"
    ),
    current_user: User = Depends(get_current_user),
):
    """Запуск процесса калибровки для указанного датчика"""
    try:
        result = await start_sensor_calibration(
            sensor_id=sensor_id, user_id=current_user.id, sensor_type=sensor_type
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при запуску калібрування: {str(e)}",
        )


@router.get("/{sensor_id}/status", response_model=Dict[str, Any])
async def get_status(
    sensor_id: str = Path(..., description="ID датчика"),
    current_user: User = Depends(get_current_user),
):
    """Получение текущего статуса калибровки датчика"""
    try:
        result = await get_calibration_status(sensor_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при отриманні статусу калібрування: {str(e)}",
        )


@router.get("", response_model=List[Dict[str, Any]])
async def list_all_calibrations(current_user: User = Depends(get_current_user)):
    """Получение списка всех калибровок для пользователя"""
    try:
        result = await get_all_calibrations(current_user.id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при отриманні списку калібрувань: {str(e)}",
        )


@router.post("/{sensor_id}/reset", response_model=Dict[str, Any])
async def reset_sensor_calibration(
    sensor_id: str = Path(..., description="ID датчика"),
    current_user: User = Depends(get_current_user),
):
    """Сброс калибровки датчика"""
    try:
        result = await reset_calibration(sensor_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при скиданні калібрування: {str(e)}",
        )
