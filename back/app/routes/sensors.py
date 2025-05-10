from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate, create_paginated_response
from app.models.user import User
from app.models.sensor_data import SensorData, SensorAlertThreshold, SensorType
from app.schemas.sensor import (
    SensorDataResponse,
    SensorDataCreate,
    SensorDataBatchCreate,
    SensorThresholdCreate,
    SensorThresholdUpdate,
    SensorThresholdResponse,
    SensorDataQueryParams,
)
from app.schemas.common import PaginatedResponse, StatusMessage
from app.services.sensor import (
    create_sensor_data,
    create_sensor_data_batch,
    get_latest_sensor_data,
    create_sensor_threshold,
    get_sensor_thresholds,
    update_sensor_threshold,
)

# Create sensors router
router = APIRouter()


@router.post("", response_model=SensorDataResponse, status_code=status.HTTP_201_CREATED)
async def add_sensor_data(
    data: SensorDataCreate, current_user: User = Depends(get_current_user)
):
    """
    Create a new sensor data record.
    """
    sensor_data = await create_sensor_data(data)
    return sensor_data


@router.post(
    "/batch",
    response_model=List[SensorDataResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_sensor_data_batch(
    data: SensorDataBatchCreate, current_user: User = Depends(get_current_user)
):
    """
    Create multiple sensor data records in a batch.
    """
    sensor_data_list = await create_sensor_data_batch(data)
    return sensor_data_list


@router.get("", response_model=PaginatedResponse[SensorDataResponse])
async def get_sensor_data(
    query_params: SensorDataQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """
    Get sensor data with optional filtering parameters.
    """
    # Build filter dict from query params
    filters = {}

    if query_params.sensor_id:
        filters["sensor_id"] = query_params.sensor_id

    if query_params.type:
        filters["type"] = query_params.type

    if query_params.location_id:
        filters["location_id"] = query_params.location_id

    if query_params.device_id:
        filters["device_id"] = query_params.device_id

    if query_params.start_date:
        filters["timestamp__gte"] = query_params.start_date

    if query_params.end_date:
        filters["timestamp__lte"] = query_params.end_date

    # Get paginated data
    items, total, page, size, pages = await paginate(
        SensorData.all().order_by("-timestamp"), pagination, filters
    )

    # Return paginated response
    return PaginatedResponse[SensorDataResponse](
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get("/latest", response_model=List[SensorDataResponse])
async def get_latest_sensor_readings(
    sensor_type: Optional[SensorType] = Query(
        None, description="Filter by sensor type"
    ),
    location_id: Optional[str] = Query(None, description="Filter by location ID"),
    sensor_id: Optional[str] = Query(None, description="Filter by sensor ID"),
    current_user: User = Depends(get_current_user),
):
    """
    Get the latest sensor readings.
    """
    latest_data = await get_latest_sensor_data(sensor_type, location_id, sensor_id)
    return latest_data


@router.get("/{sensor_id}", response_model=List[SensorDataResponse])
async def get_sensor_data_by_id(
    sensor_id: str = Path(..., description="Sensor ID"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    current_user: User = Depends(get_current_user),
):
    """
    Get sensor data for a specific sensor.
    """
    # Build query
    query = SensorData.filter(sensor_id=sensor_id).order_by("-timestamp")

    if start_date:
        query = query.filter(timestamp__gte=start_date)

    if end_date:
        query = query.filter(timestamp__lte=end_date)

    # Execute query
    data = await query.limit(limit)
    return data


# Threshold management endpoints


@router.post(
    "/thresholds",
    response_model=SensorThresholdResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_sensor_threshold(
    data: SensorThresholdCreate, current_user: User = Depends(get_manager_user)
):
    """
    Create a new sensor alert threshold.
    """
    threshold = await create_sensor_threshold(data, current_user.id)
    return threshold


@router.get("/thresholds", response_model=List[SensorThresholdResponse])
async def list_sensor_thresholds(
    sensor_type: Optional[SensorType] = Query(
        None, description="Filter by sensor type"
    ),
    active_only: bool = Query(True, description="Return only active thresholds"),
    current_user: User = Depends(get_current_user),
):
    """
    Get all sensor alert thresholds.
    """
    thresholds = await get_sensor_thresholds(sensor_type, active_only)
    return thresholds


@router.patch("/thresholds/{threshold_id}", response_model=SensorThresholdResponse)
async def update_threshold(
    threshold_id: int = Path(..., description="Threshold ID"),
    threshold_data: SensorThresholdUpdate = Depends(),
    current_user: User = Depends(get_manager_user),
):
    """
    Update a sensor alert threshold.
    """
    threshold = await update_sensor_threshold(
        threshold_id=threshold_id,
        min_value=threshold_data.min_value,
        max_value=threshold_data.max_value,
        is_active=threshold_data.is_active,
    )
    return threshold
