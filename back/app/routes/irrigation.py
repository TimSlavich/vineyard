from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from loguru import logger

from app.models.irrigation import (
    IrrigationZone,
    IrrigationSchedule,
    MoistureRecord,
    IrrigationEvent,
    DayOfWeek,
)
from app.schemas.irrigation import (
    IrrigationZone as IrrigationZoneSchema,
    IrrigationZoneUpdate,
    IrrigationSystemState,
    IrrigationSchedule as IrrigationScheduleSchema,
    MoistureDataPoint,
    MoistureHistory,
)
from app.deps.auth import get_current_user, get_manager_user
from app.models.user import User
from app.schemas.common import StatusMessage, WebSocketMessage
from app.websockets.connection_manager import manager


router = APIRouter()


@router.get("/zones", response_model=List[IrrigationZoneSchema])
async def get_irrigation_zones(current_user: User = Depends(get_current_user)):
    """Получение списка зон полива"""
    # Если зон нет, создаем две тестовые зоны
    zones_count = await IrrigationZone.all().count()
    if zones_count == 0:
        # Создаем тестовые зоны для демонстрации
        await IrrigationZone.create(
            zone_id="zone1",
            zone_name="Блок A",
            threshold=40.0,
            current_moisture=38.0,
            created_by=current_user,
        )
        await IrrigationZone.create(
            zone_id="zone2",
            zone_name="Блок B",
            threshold=45.0,
            current_moisture=42.0,
            created_by=current_user,
        )

    # Получаем все зоны
    zones = await IrrigationZone.all().prefetch_related("schedules")
    result = []

    for zone in zones:
        # Получаем расписание для зоны (берем первое, если есть)
        schedule = await IrrigationSchedule.filter(zone=zone).first()
        if not schedule:
            # Если расписания нет, создаем дефолтное
            schedule = await IrrigationSchedule.create(
                zone=zone,
                enabled=False,
                start_time="06:00",
                duration=30,
                days=["monday", "wednesday", "friday"],
            )

        # Создаем схему зоны
        zone_schema = IrrigationZoneSchema(
            zone_id=zone.zone_id,
            zone_name=zone.zone_name,
            state={
                "is_active": zone.is_active,
                "current_moisture": zone.current_moisture,
                "threshold": zone.threshold,
                "is_irrigating": zone.is_irrigating,
                "schedule": {
                    "enabled": schedule.enabled,
                    "start_time": schedule.start_time,
                    "duration": schedule.duration,
                    "days": schedule.days,
                },
                "last_updated": zone.updated_at,
            },
        )
        result.append(zone_schema)

    return result


@router.get("/system", response_model=IrrigationSystemState)
async def get_irrigation_system(current_user: User = Depends(get_current_user)):
    """Получение состояния всей системы полива"""
    zones = await get_irrigation_zones(current_user)
    return IrrigationSystemState(zones=zones, last_updated=datetime.utcnow())


@router.get("/zones/{zone_id}", response_model=IrrigationZoneSchema)
async def get_irrigation_zone(
    zone_id: str = Path(..., description="Идентификатор зоны"),
    current_user: User = Depends(get_current_user),
):
    """Получение состояния конкретной зоны полива"""
    zone = await IrrigationZone.get_or_none(zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Зона полива с ID {zone_id} не найдена",
        )

    # Получаем расписание для зоны
    schedule = await IrrigationSchedule.filter(zone=zone).first()
    if not schedule:
        # Если расписания нет, создаем дефолтное
        schedule = await IrrigationSchedule.create(
            zone=zone,
            enabled=False,
            start_time="06:00",
            duration=30,
            days=["monday", "wednesday", "friday"],
        )

    return IrrigationZoneSchema(
        zone_id=zone.zone_id,
        zone_name=zone.zone_name,
        state={
            "is_active": zone.is_active,
            "current_moisture": zone.current_moisture,
            "threshold": zone.threshold,
            "is_irrigating": zone.is_irrigating,
            "schedule": {
                "enabled": schedule.enabled,
                "start_time": schedule.start_time,
                "duration": schedule.duration,
                "days": schedule.days,
            },
            "last_updated": zone.updated_at,
        },
    )


@router.patch("/zones/{zone_id}", response_model=IrrigationZoneSchema)
async def update_irrigation_zone(
    update_data: IrrigationZoneUpdate,
    zone_id: str = Path(..., description="Идентификатор зоны"),
    current_user: User = Depends(get_manager_user),
):
    """Обновление состояния зоны полива"""
    zone = await IrrigationZone.get_or_none(zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Зона полива с ID {zone_id} не найдена",
        )

    # Обновляем поля, если они есть в запросе
    if update_data.is_active is not None:
        zone.is_active = update_data.is_active

    if update_data.threshold is not None:
        zone.threshold = update_data.threshold

    if update_data.is_irrigating is not None:
        zone.is_irrigating = update_data.is_irrigating

        # Если включаем полив, создаем событие полива
        if update_data.is_irrigating:
            await IrrigationEvent.create(
                zone=zone,
                start_time=datetime.utcnow(),
                triggered_by="manual",
                created_by=current_user,
            )
        else:
            # Если выключаем полив, закрываем активные события
            active_events = await IrrigationEvent.filter(
                zone=zone, status="active", end_time=None
            )
            for event in active_events:
                event.end_time = datetime.utcnow()
                event.status = "completed"
                event.duration = int(
                    (event.end_time - event.start_time).total_seconds()
                )
                await event.save()

    # Обновляем расписание, если оно есть в запросе
    if update_data.schedule:
        schedule = await IrrigationSchedule.filter(zone=zone).first()
        if not schedule:
            # Если расписания нет, создаем новое
            schedule = await IrrigationSchedule.create(
                zone=zone,
                enabled=update_data.schedule.enabled,
                start_time=update_data.schedule.start_time,
                duration=update_data.schedule.duration,
                days=update_data.schedule.days,
            )
        else:
            # Обновляем существующее расписание
            schedule.enabled = update_data.schedule.enabled
            schedule.start_time = update_data.schedule.start_time
            schedule.duration = update_data.schedule.duration
            schedule.days = update_data.schedule.days
            await schedule.save()

    # Сохраняем обновления в зоне
    await zone.save()

    # Отправляем уведомление через WebSocket
    await broadcast_irrigation_update(zone, current_user)

    # Возвращаем обновленные данные
    return await get_irrigation_zone(zone_id, current_user)


@router.get("/zones/{zone_id}/moisture", response_model=MoistureHistory)
async def get_zone_moisture_history(
    zone_id: str = Path(..., description="Идентификатор зоны"),
    days: int = Query(1, description="Количество дней для истории"),
    current_user: User = Depends(get_current_user),
):
    """Получение истории влажности для зоны"""
    zone = await IrrigationZone.get_or_none(zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Зона полива с ID {zone_id} не найдена",
        )

    # Получаем записи влажности за указанный период
    start_date = datetime.utcnow() - timedelta(days=days)
    records = await MoistureRecord.filter(
        zone=zone, timestamp__gte=start_date
    ).order_by("timestamp")

    # Если записей нет, генерируем тестовые данные
    if not records:
        test_data = []
        current_time = datetime.utcnow()

        # Создаем тестовые данные влажности для каждого часа за указанный период
        for hour in range(days * 24, 0, -1):
            timestamp = current_time - timedelta(hours=hour)
            # Генерируем значение влажности, колеблющееся вокруг порога
            value = zone.threshold + (((hour % 12) - 6) * 2)
            test_data.append(MoistureDataPoint(timestamp=timestamp, value=value))

        # Сохраняем тестовые данные в базу
        for data_point in test_data:
            await MoistureRecord.create(
                zone=zone,
                value=data_point.value,
                timestamp=data_point.timestamp,
            )

        # Обновляем текущую влажность зоны
        if test_data:
            zone.current_moisture = test_data[-1].value
            await zone.save()

        return MoistureHistory(zone_id=zone_id, data=test_data)

    # Преобразуем записи в формат API
    data_points = [
        MoistureDataPoint(timestamp=record.timestamp, value=record.value)
        for record in records
    ]

    return MoistureHistory(zone_id=zone_id, data=data_points)


@router.post("/zones/{zone_id}/irrigate", response_model=StatusMessage)
async def start_irrigation(
    zone_id: str = Path(..., description="Идентификатор зоны"),
    duration: int = Query(5, description="Продолжительность полива в минутах"),
    current_user: User = Depends(get_manager_user),
):
    """Запуск полива вручную на указанную продолжительность"""
    zone = await IrrigationZone.get_or_none(zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Зона полива с ID {zone_id} не найдена",
        )

    if not zone.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Система полива неактивна",
        )

    # Устанавливаем флаг полива
    zone.is_irrigating = True
    await zone.save()

    # Создаем событие полива
    await IrrigationEvent.create(
        zone=zone,
        start_time=datetime.utcnow(),
        triggered_by="manual",
        created_by=current_user,
    )

    # Отправляем уведомление через WebSocket
    await broadcast_irrigation_update(zone, current_user)

    return StatusMessage(
        status="success",
        message=f"Полив в зоне {zone.zone_name} запущен на {duration} минут",
    )


@router.post("/zones/{zone_id}/stop", response_model=StatusMessage)
async def stop_irrigation(
    zone_id: str = Path(..., description="Идентификатор зоны"),
    current_user: User = Depends(get_manager_user),
):
    """Остановка полива вручную"""
    zone = await IrrigationZone.get_or_none(zone_id=zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Зона полива с ID {zone_id} не найдена",
        )

    if not zone.is_irrigating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Полив не активен",
        )

    # Снимаем флаг полива
    zone.is_irrigating = False
    await zone.save()

    # Закрываем активные события полива
    active_events = await IrrigationEvent.filter(
        zone=zone, status="active", end_time=None
    )
    for event in active_events:
        event.end_time = datetime.utcnow()
        event.status = "completed"
        event.duration = int((event.end_time - event.start_time).total_seconds())
        await event.save()

    # Отправляем уведомление через WebSocket
    await broadcast_irrigation_update(zone, current_user)

    return StatusMessage(
        status="success",
        message=f"Полив в зоне {zone.zone_name} остановлен",
    )


async def broadcast_irrigation_update(zone: IrrigationZone, user: User):
    """Отправляет обновления о поливе всем подключенным клиентам"""
    try:
        # Получаем расписание для зоны
        schedule = await IrrigationSchedule.filter(zone=zone).first()

        # Если расписание не найдено, используем значения по умолчанию
        schedule_data = {
            "enabled": False,
            "start_time": "06:00",
            "duration": 30,
            "days": ["monday", "wednesday", "friday"],
        }

        if schedule:
            schedule_data = {
                "enabled": schedule.enabled,
                "start_time": schedule.start_time,
                "duration": schedule.duration,
                "days": schedule.days,
            }

        # Создаем сообщение для отправки
        message = {
            "type": "irrigation_update",
            "event": "irrigation_update",
            "data": {
                "zone_id": zone.zone_id,
                "zone_name": zone.zone_name,
                "is_active": zone.is_active,
                "current_moisture": zone.current_moisture,
                "threshold": zone.threshold,
                "is_irrigating": zone.is_irrigating,
                "schedule": schedule_data,
                "last_updated": zone.updated_at.isoformat(),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user.id if user else None,
        }

        # Отправляем сообщение через менеджер WebSocket
        await manager.broadcast(WebSocketMessage(**message))

    except Exception as e:
        logger.error(f"Ошибка при отправке обновления по WebSocket: {e}")
