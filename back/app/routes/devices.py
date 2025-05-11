from typing import List

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate
from app.models.user import User
from app.models.device_settings import (
    Device,
    DeviceSettings,
    DeviceActionLog,
    DeviceMode,
    DeviceStatus,
)
from app.schemas.device import (
    DeviceResponse,
    DeviceCreate,
    DeviceUpdate,
    DeviceSettingsResponse,
    DeviceSettingsCreate,
    DeviceAction,
    DeviceActionResponse,
    DeviceQueryParams,
)
from app.schemas.common import PaginatedResponse, StatusMessage

# Create devices router
router = APIRouter()


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    data: DeviceCreate, current_user: User = Depends(get_manager_user)
):
    """Регистрация нового устройства"""
    # Проверка существования устройства с таким ID
    existing = await Device.filter(device_id=data.device_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Устройство с ID {data.device_id} уже существует",
        )

    # Создание устройства
    device = await Device.create(
        name=data.name,
        device_id=data.device_id,
        type=data.type,
        location_id=data.location_id,
        ip_address=data.ip_address,
        mac_address=data.mac_address,
        firmware_version=data.firmware_version,
        metadata=data.metadata,
        status=DeviceStatus.OFFLINE,
        mode=DeviceMode.OFF,
    )

    logger.info(f"Устройство создано: {device.name} ({device.device_id})")
    return device


@router.get("", response_model=PaginatedResponse[DeviceResponse])
async def get_devices(
    query_params: DeviceQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """Получение всех устройств с опциональной фильтрацией"""
    # Построение фильтра из параметров запроса
    filters = {}

    if query_params.type:
        filters["type"] = query_params.type
    if query_params.location_id:
        filters["location_id"] = query_params.location_id
    if query_params.status:
        filters["status"] = query_params.status
    if query_params.mode:
        filters["mode"] = query_params.mode

    # Получение устройств с пагинацией
    items, total, page, size, pages = await paginate(
        Device.all().order_by("name"), pagination, filters
    )

    return PaginatedResponse[DeviceResponse](
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_current_user),
):
    """Получение конкретного устройства по ID"""
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_data: DeviceUpdate,
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_manager_user),
):
    """Обновление устройства"""
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    update_data = device_data.dict(exclude_unset=True)
    if update_data:
        await device.update_from_dict(update_data).save()
        logger.info(f"Устройство обновлено: {device.name} ({device.device_id})")

    return device


@router.delete("/{device_id}", response_model=StatusMessage)
async def delete_device(
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_manager_user),
):
    """Удаление устройства"""
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    await device.delete()
    logger.info(f"Устройство удалено: {device.name} ({device.device_id})")

    return {"status": "success", "message": f"Устройство {device_id} успешно удалено"}


@router.post("/{device_id}/settings", response_model=DeviceSettingsResponse)
async def create_device_settings(
    data: DeviceSettingsCreate,
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_manager_user),
):
    """Создание настроек для устройства"""
    # Проверка существования устройства
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    # Деактивация существующих активных настроек
    await DeviceSettings.filter(device=device, is_active=True).update(is_active=False)

    # Создание новых настроек
    settings = await DeviceSettings.create(
        device=device,
        mode=data.mode,
        parameters=data.parameters,
        schedule=data.schedule,
        thresholds=data.thresholds,
        created_by=current_user,
    )

    # Обновление режима устройства
    await device.update_from_dict({"mode": data.mode}).save()

    logger.info(f"Созданы настройки устройства для: {device.name} ({device.device_id})")
    return settings


@router.get("/{device_id}/settings", response_model=List[DeviceSettingsResponse])
async def get_device_settings(
    device_id: str = Path(..., description="ID устройства"),
    active_only: bool = Query(True, description="Только активные настройки"),
    current_user: User = Depends(get_current_user),
):
    """Получение настроек устройства"""
    # Проверка существования устройства
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    # Запрос настроек
    query = DeviceSettings.filter(device=device)
    if active_only:
        query = query.filter(is_active=True)

    settings = await query.order_by("-created_at")
    return settings


@router.post("/{device_id}/actions", response_model=DeviceActionResponse)
async def execute_device_action(
    data: DeviceAction,
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_manager_user),
):
    """Выполнение действия на устройстве"""
    # Проверка существования устройства
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    # Проверка статуса устройства
    if device.status != DeviceStatus.ONLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Устройство {device_id} не в сети",
        )

    # Журналирование действия
    action_log = await DeviceActionLog.create(
        device=device,
        action=data.action,
        parameters=data.parameters,
        status="pending",
        initiated_by=current_user,
        source="API",
    )

    # В реальном приложении здесь была бы связь с устройством
    # Пока просто симуляция успешного действия
    result = {"success": True, "message": f"Действие {data.action} успешно выполнено"}

    # Обновление журнала действий с результатом
    await action_log.update_from_dict({"result": result, "status": "completed"}).save()

    logger.info(
        f"Действие {data.action} выполнено на устройстве: {device.name} ({device.device_id})"
    )

    return {
        "device_id": device_id,
        "action": data.action,
        "status": "completed",
        "result": result,
        "timestamp": action_log.timestamp,
    }


@router.get("/{device_id}/actions", response_model=List[DeviceActionResponse])
async def get_device_actions(
    device_id: str = Path(..., description="ID устройства"),
    limit: int = Query(
        20, ge=1, le=100, description="Количество действий для возврата"
    ),
    current_user: User = Depends(get_current_user),
):
    """Получение истории действий для устройства"""
    # Проверка существования устройства
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    # Получение журнала действий
    action_logs = (
        await DeviceActionLog.filter(device=device).order_by("-timestamp").limit(limit)
    )

    # Преобразование в формат ответа
    actions = [
        {
            "device_id": device_id,
            "action": log.action,
            "status": log.status,
            "result": log.result,
            "timestamp": log.timestamp,
        }
        for log in action_logs
    ]

    return actions


@router.post("/{device_id}/status", response_model=DeviceResponse)
async def update_device_status(
    status: DeviceStatus,
    device_id: str = Path(..., description="ID устройства"),
    current_user: User = Depends(get_manager_user),
):
    """Обновление статуса устройства"""
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Устройство с ID {device_id} не найдено",
        )

    # Обновление статуса
    await device.update_from_dict({"status": status}).save()
    logger.info(
        f"Статус устройства обновлен: {device.name} ({device.device_id}) -> {status}"
    )

    return device
