from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import HTTPException, status
from loguru import logger
from tortoise.exceptions import DoesNotExist

from app.models.sensor_data import SensorData, SensorAlertThreshold, SensorType
from app.schemas.sensor import (
    SensorDataCreate,
    SensorThresholdCreate,
    SensorDataBatchCreate,
)
from app.schemas.common import WebSocketMessage
from app.websockets.connection_manager import manager


async def create_sensor_data(data: SensorDataCreate) -> SensorData:
    """
    Create new sensor data record.

    Args:
        data: Sensor data to create

    Returns:
        SensorData: Created sensor data
    """
    # Create the sensor data record
    sensor_data = await SensorData.create(
        sensor_id=data.sensor_id,
        type=data.type,
        value=data.value,
        unit=data.unit,
        location_id=data.location_id,
        device_id=data.device_id,
        metadata=data.metadata,
    )

    # Check alert thresholds and set status
    await check_sensor_thresholds(sensor_data)

    # Broadcast sensor data to WebSocket clients
    await broadcast_sensor_data(sensor_data)

    return sensor_data


async def create_sensor_data_batch(data: SensorDataBatchCreate) -> List[SensorData]:
    """
    Create multiple sensor data records in batch.

    Args:
        data: Batch of sensor data to create

    Returns:
        List[SensorData]: Created sensor data records
    """
    # Create all sensor data records
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

        # Check alert thresholds and set status
        await check_sensor_thresholds(sensor_data)
        sensor_data_records.append(sensor_data)

    # Broadcast all new sensor data
    for sensor_data in sensor_data_records:
        await broadcast_sensor_data(sensor_data)

    return sensor_data_records


async def get_latest_sensor_data(
    sensor_type: Optional[SensorType] = None,
    location_id: Optional[str] = None,
    sensor_id: Optional[str] = None,
) -> List[SensorData]:
    """
    Get latest sensor data, optionally filtered by type, location, or sensor ID.

    Args:
        sensor_type: Optional sensor type to filter by
        location_id: Optional location ID to filter by
        sensor_id: Optional sensor ID to filter by

    Returns:
        List[SensorData]: Latest sensor data records
    """
    # Build the query based on provided filters
    query = SensorData.all()

    if sensor_type:
        query = query.filter(type=sensor_type)

    if location_id:
        query = query.filter(location_id=location_id)

    if sensor_id:
        query = query.filter(sensor_id=sensor_id)

    # Get the latest records for each unique sensor
    # This is a more complex query that gets the latest record per sensor ID
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
    Create a new sensor alert threshold.

    Args:
        data: Threshold data to create
        user_id: ID of the user creating the threshold

    Returns:
        SensorAlertThreshold: Created threshold
    """
    # Check if a threshold for this sensor type and unit already exists
    existing = await SensorAlertThreshold.filter(
        sensor_type=data.sensor_type, unit=data.unit, is_active=True
    ).first()

    if existing:
        # Deactivate the existing threshold
        await existing.update_from_dict({"is_active": False}).save()

    # Create the new threshold
    threshold = await SensorAlertThreshold.create(
        sensor_type=data.sensor_type,
        min_value=data.min_value,
        max_value=data.max_value,
        unit=data.unit,
        created_by_id=user_id,
    )

    logger.info(
        f"Created new threshold for {data.sensor_type}: {data.min_value} to {data.max_value} {data.unit}"
    )
    return threshold


async def get_sensor_thresholds(
    sensor_type: Optional[SensorType] = None, active_only: bool = True
) -> List[SensorAlertThreshold]:
    """
    Get sensor alert thresholds, optionally filtered by type.

    Args:
        sensor_type: Optional sensor type to filter by
        active_only: Whether to return only active thresholds

    Returns:
        List[SensorAlertThreshold]: Threshold records
    """
    query = SensorAlertThreshold.all()

    if sensor_type:
        query = query.filter(sensor_type=sensor_type)

    if active_only:
        query = query.filter(is_active=True)

    return await query.order_by("sensor_type")


async def update_sensor_threshold(
    threshold_id: int,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    is_active: Optional[bool] = None,
) -> SensorAlertThreshold:
    """
    Update a sensor alert threshold.

    Args:
        threshold_id: ID of threshold to update
        min_value: Optional new minimum value
        max_value: Optional new maximum value
        is_active: Optional new active status

    Returns:
        SensorAlertThreshold: Updated threshold

    Raises:
        HTTPException: If threshold not found
    """
    try:
        threshold = await SensorAlertThreshold.get(id=threshold_id)

        # Update provided fields
        if min_value is not None:
            threshold.min_value = min_value

        if max_value is not None:
            threshold.max_value = max_value

        if is_active is not None:
            threshold.is_active = is_active

        await threshold.save()
        logger.info(
            f"Updated threshold ID {threshold_id}: {threshold.min_value} to {threshold.max_value} {threshold.unit}"
        )
        return threshold

    except DoesNotExist:
        logger.error(f"Threshold with ID {threshold_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Threshold with ID {threshold_id} not found",
        )


async def check_sensor_thresholds(sensor_data: SensorData) -> None:
    """
    Check sensor data against thresholds and update status.

    Args:
        sensor_data: Sensor data to check
    """
    # Get the active threshold for this sensor type and unit
    threshold = await SensorAlertThreshold.filter(
        sensor_type=sensor_data.type, unit=sensor_data.unit, is_active=True
    ).first()

    if not threshold:
        # No threshold set, maintain normal status
        sensor_data.status = "normal"
        await sensor_data.save()
        return

    # Check against thresholds
    if sensor_data.value < threshold.min_value:
        sensor_data.status = "low"
        await sensor_data.save()

        # Broadcast alert if below threshold
        await broadcast_sensor_alert(
            sensor_data=sensor_data,
            threshold=threshold,
            alert_type="low",
            message=f"Sensor {sensor_data.sensor_id} value ({sensor_data.value} {sensor_data.unit}) is below minimum threshold ({threshold.min_value} {threshold.unit})",
        )

    elif sensor_data.value > threshold.max_value:
        sensor_data.status = "high"
        await sensor_data.save()

        # Broadcast alert if above threshold
        await broadcast_sensor_alert(
            sensor_data=sensor_data,
            threshold=threshold,
            alert_type="high",
            message=f"Sensor {sensor_data.sensor_id} value ({sensor_data.value} {sensor_data.unit}) is above maximum threshold ({threshold.max_value} {threshold.unit})",
        )

    else:
        sensor_data.status = "normal"
        await sensor_data.save()


async def broadcast_sensor_data(sensor_data: SensorData) -> None:
    """
    Broadcast sensor data to WebSocket clients.

    Args:
        sensor_data: Sensor data to broadcast
    """
    # Prepare data for WebSocket message
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
    }

    # Create WebSocket message
    message = WebSocketMessage(
        type="sensor_data",
        data=data,
    )

    # Broadcast to different groups
    # 1. Sensor type group
    await manager.broadcast_to_group(message, f"sensor:{sensor_data.type.value}")

    # 2. Location group
    await manager.broadcast_to_group(message, f"location:{sensor_data.location_id}")

    # 3. All sensors group
    await manager.broadcast_to_group(message, "sensor:all")


async def broadcast_sensor_alert(
    sensor_data: SensorData,
    threshold: SensorAlertThreshold,
    alert_type: str,
    message: str,
) -> None:
    """
    Broadcast sensor alert to WebSocket clients.

    Args:
        sensor_data: Sensor data that triggered the alert
        threshold: Threshold that was violated
        alert_type: Type of alert (high/low)
        message: Alert message
    """
    # Prepare alert data
    alert_data = {
        "id": sensor_data.id,
        "sensor_id": sensor_data.sensor_id,
        "type": sensor_data.type.value,
        "value": sensor_data.value,
        "unit": sensor_data.unit,
        "timestamp": sensor_data.timestamp.isoformat(),
        "location_id": sensor_data.location_id,
        "status": sensor_data.status,
        "device_id": sensor_data.device_id,
        "alert_type": alert_type,
        "message": message,
        "threshold": {
            "id": threshold.id,
            "min_value": threshold.min_value,
            "max_value": threshold.max_value,
            "unit": threshold.unit,
        },
    }

    # Create WebSocket message
    message = WebSocketMessage(
        type="sensor_alert",
        data=alert_data,
    )

    # Broadcast alert to alert group
    await manager.broadcast_to_group(message, "sensor:alerts")

    # Broadcast to sensor type group
    await manager.broadcast_to_group(message, f"sensor:{sensor_data.type.value}")

    # Broadcast to location group
    await manager.broadcast_to_group(message, f"location:{sensor_data.location_id}")

    logger.warning(f"Sensor alert: {message}")
