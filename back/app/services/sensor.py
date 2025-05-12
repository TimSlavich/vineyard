from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import HTTPException, status
from loguru import logger
from tortoise.exceptions import DoesNotExist

from app.models.sensor_data import SensorData, SensorAlertThreshold, SensorType
from app.schemas.sensor import (
    SensorThresholdCreate,
    SensorDataBatchCreate,
    SensorDataCreate,
)
from app.schemas.common import WebSocketMessage
from app.websockets.connection_manager import manager


async def create_sensor_data(data: SensorDataCreate) -> SensorData:
    """
    Создание новой записи данных датчика.

    Args:
        data: Данные датчика для создания

    Returns:
        Созданная запись данных датчика
    """
    logger.debug(f"Создание данных датчика: {data.model_dump_json()}")

    # Получение ID пользователя из поля user_id или из метаданных
    user_id = data.user_id
    if user_id is None and data.metadata and "user_id" in data.metadata:
        user_id = data.metadata["user_id"]

    logger.debug(
        f"Установка user_id={user_id} для данных датчика с sensor_id={data.sensor_id}"
    )

    # Создание экземпляра модели
    sensor_data = SensorData(
        sensor_id=data.sensor_id,
        type=data.type,
        value=data.value,
        unit=data.unit,
        location_id=data.location_id,
        device_id=data.device_id,
        metadata=data.metadata or {},
        status=data.status or "active",
        user_id=user_id,
    )

    # Сохранение в базу данных
    await sensor_data.save()

    logger.debug(f"Данные датчика созданы с ID: {sensor_data.id}")

    # Проверка на соответствие пороговым значениям
    await check_sensor_thresholds(sensor_data)
    logger.debug(f"Проверка пороговых значений для датчика {sensor_data.id} выполнена")

    # Отправка данных через WebSocket
    await broadcast_sensor_data(sensor_data)
    logger.debug(f"Данные датчика {sensor_data.id} отправлены через WebSocket")

    return sensor_data


async def create_sensor_data_batch(data: SensorDataBatchCreate) -> List[SensorData]:
    """
    Создание нескольких записей данных датчиков одним запросом.

    Args:
        data: Пакет данных датчиков для создания

    Returns:
        Список созданных записей данных датчиков
    """
    sensor_data_records = []

    for item in data.data:
        sensor_data = await SensorData.create(
            sensor_id=item.sensor_id,
            type=item.type,
            value=item.value,
            unit=item.unit,
            location_id=item.location_id,
            device_id=item.device_id,
            metadata=item.metadata,
        )

        # Проверка пороговых значений и установка статуса
        await check_sensor_thresholds(sensor_data)
        sensor_data_records.append(sensor_data)

    # Отправка оповещений для новых данных
    for sensor_data in sensor_data_records:
        await broadcast_sensor_data(sensor_data)

    return sensor_data_records


async def get_latest_sensor_data(
    sensor_type: Optional[SensorType] = None,
    location_id: Optional[str] = None,
    sensor_id: Optional[str] = None,
    user_id: Optional[int] = None,
) -> List[SensorData]:
    """
    Получение последних данных датчиков с опциональной фильтрацией.

    Args:
        sensor_type: Тип датчика для фильтрации
        location_id: ID места расположения для фильтрации
        sensor_id: ID датчика для фильтрации
        user_id: ID пользователя для фильтрации

    Returns:
        Список последних записей данных датчиков
    """
    # Построение запроса на основе фильтров
    query = SensorData.all()

    if sensor_type:
        query = query.filter(type=sensor_type)
    if location_id:
        query = query.filter(location_id=location_id)
    if sensor_id:
        query = query.filter(sensor_id=sensor_id)
    if user_id is not None:
        query = query.filter(user_id=user_id)
        logger.debug(f"Фильтрация данных датчика по user_id: {user_id}")

    # Получение последних записей для каждого уникального датчика
    latest_sensors = {}
    async for data in query.order_by("-timestamp"):
        key = f"{data.sensor_id}_{data.type}_{data.location_id}"
        if key not in latest_sensors:
            latest_sensors[key] = data

    return list(latest_sensors.values())


async def create_sensor_threshold(
    data: SensorThresholdCreate, user_id: int
) -> SensorAlertThreshold:
    """
    Создание нового порогового значения оповещения датчика.

    Args:
        data: Данные порогового значения для создания
        user_id: ID пользователя, создающего пороговое значение

    Returns:
        Созданное пороговое значение
    """
    # Проверка существования порогового значения для этого типа датчика и единицы измерения
    existing = await SensorAlertThreshold.filter(
        sensor_type=data.sensor_type, unit=data.unit, is_active=True
    ).first()

    if existing:
        # Деактивация существующего порогового значения
        await existing.update_from_dict({"is_active": False}).save()

    # Создание нового порогового значения
    threshold = await SensorAlertThreshold.create(
        sensor_type=data.sensor_type,
        min_value=data.min_value,
        max_value=data.max_value,
        unit=data.unit,
        created_by_id=user_id,
    )

    logger.info(
        f"Создано новое пороговое значение для {data.sensor_type}: от {data.min_value} до {data.max_value} {data.unit}"
    )
    return threshold


async def get_sensor_thresholds(
    sensor_type: Optional[SensorType] = None, active_only: bool = True
) -> List[SensorAlertThreshold]:
    """
    Получение пороговых значений оповещений датчиков с опциональной фильтрацией.

    Args:
        sensor_type: Тип датчика для фильтрации
        active_only: Флаг для получения только активных пороговых значений

    Returns:
        Список записей пороговых значений
    """
    query = SensorAlertThreshold.all()

    if sensor_type:
        query = query.filter(sensor_type=sensor_type)
    if active_only:
        query = query.filter(is_active=True)

    return await query.order_by("sensor_type")


async def get_thresholds_for_user(user_id: int) -> Dict[str, SensorAlertThreshold]:
    """
    Получает все активные пороговые значения для пользователя,
    в виде словаря с ключами по типу датчика.

    Args:
        user_id: ID пользователя

    Returns:
        Словарь с типами датчиков в качестве ключей и пороговыми значениями в качестве значений
    """
    # Получаем все активные пороги
    thresholds = await get_sensor_thresholds(active_only=True)

    # Создаем словарь с ключами по типу датчика
    result = {}
    for threshold in thresholds:
        result[threshold.sensor_type.value] = threshold

    logger.debug(
        f"Получены пороговые значения для пользователя {user_id}: {len(result)} типов датчиков"
    )
    return result


async def update_sensor_threshold(
    threshold_id: int,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    is_active: Optional[bool] = None,
) -> SensorAlertThreshold:
    """
    Обновление порогового значения оповещения датчика.

    Args:
        threshold_id: ID порогового значения для обновления
        min_value: Новое минимальное значение
        max_value: Новое максимальное значение
        is_active: Новый статус активности

    Returns:
        Обновленное пороговое значение

    Raises:
        HTTPException: Если пороговое значение не найдено
    """
    try:
        threshold = await SensorAlertThreshold.get(id=threshold_id)

        # Обновление указанных полей
        if min_value is not None:
            threshold.min_value = min_value
        if max_value is not None:
            threshold.max_value = max_value
        if is_active is not None:
            threshold.is_active = is_active

        await threshold.save()
        logger.info(
            f"Обновлено пороговое значение ID {threshold_id}: от {threshold.min_value} до {threshold.max_value} {threshold.unit}"
        )
        return threshold

    except DoesNotExist:
        logger.error(f"Пороговое значение с ID {threshold_id} не найдено")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пороговое значение с ID {threshold_id} не найдено",
        )


async def check_sensor_thresholds(sensor_data: SensorData) -> None:
    """
    Проверка данных датчика на соответствие пороговым значениям и обновление статуса.
    Логика отправки оповещений удалена, оставлена только установка статуса.

    Args:
        sensor_data: Данные датчика для проверки
    """
    # Получение активного порогового значения для этого типа датчика и единицы измерения
    threshold = await SensorAlertThreshold.filter(
        sensor_type=sensor_data.type, unit=sensor_data.unit, is_active=True
    ).first()

    if not threshold:
        # Нет порогового значения, поддержание нормального статуса
        sensor_data.status = "normal"
        await sensor_data.save()
        return

    # Проверка на соответствие пороговым значениям
    if sensor_data.value < threshold.min_value:
        sensor_data.status = "low"
        await sensor_data.save()
    elif sensor_data.value > threshold.max_value:
        sensor_data.status = "high"
        await sensor_data.save()
    else:
        sensor_data.status = "normal"
        await sensor_data.save()


async def broadcast_sensor_data(sensor_data: SensorData) -> None:
    """
    Отправка данных датчика клиентам через WebSocket.

    Args:
        sensor_data: Данные датчика для отправки
    """
    # Подготовка данных для WebSocket сообщения
    data = {
        "id": sensor_data.id,
        "sensor_id": sensor_data.sensor_id,
        "type": sensor_data.type.value,
        "value": sensor_data.value,
        "unit": sensor_data.unit,
        "timestamp": sensor_data.timestamp.isoformat(),
        "location_id": sensor_data.location_id,
        "status": sensor_data.status,
        "device_id": sensor_data.device_id,
        "user_id": sensor_data.user_id,
    }

    logger.debug(
        f"Отправка данных датчика - id: {sensor_data.id}, sensor_id: {sensor_data.sensor_id}, "
        f"user_id: {sensor_data.user_id}, type: {sensor_data.type.value}"
    )

    # Создание WebSocket сообщения
    message = WebSocketMessage(
        type="sensor_data",
        data=data,
    )

    # Отправка данных в зависимости от наличия user_id
    if sensor_data.user_id:
        # 1. Отправка в пользовательскую группу
        user_group = f"user:{sensor_data.user_id}"
        connections_count = len(manager.group_connections.get(user_group, []))
        logger.debug(
            f"Отправка в группу '{user_group}' с {connections_count} соединениями, sensor_id: {sensor_data.sensor_id}"
        )
        await manager.broadcast_to_group(message, user_group)

        # 2. Отправка напрямую в соединения пользователя (для обратной совместимости)
        user_connections = manager.user_connections.get(sensor_data.user_id, [])
        logger.debug(
            f"Отправка пользователю {sensor_data.user_id} с {len(user_connections)} прямыми соединениями, "
            f"sensor_id: {sensor_data.sensor_id}"
        )

        for connection in user_connections:
            await manager.send_personal_message(message, connection)
    else:
        # Предупреждение при отсутствии user_id
        logger.warning(
            f"Данные датчика без user_id: {sensor_data.sensor_id}. Это может привести к видимости данных для всех пользователей."
        )

        # Отправка во все группы (обратная совместимость)
        # 1. Группа типа датчика
        type_group = f"sensor:{sensor_data.type.value}"
        await manager.broadcast_to_group(message, type_group)

        # 2. Группа локации
        location_group = f"location:{sensor_data.location_id}"
        await manager.broadcast_to_group(message, location_group)

        # 3. Группа всех датчиков
        all_sensors_group = "sensor:all"
        await manager.broadcast_to_group(message, all_sensors_group)

    logger.debug(
        f"Всего активных WebSocket соединений: {len(manager.active_connections)}"
    )
