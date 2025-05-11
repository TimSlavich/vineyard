from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Path, status

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate
from app.models.user import User
from app.models.sensor_data import SensorData, SensorType
from app.schemas.sensor import (
    SensorDataResponse,
    SensorDataCreate,
    SensorDataBatchCreate,
    SensorThresholdCreate,
    SensorThresholdUpdate,
    SensorThresholdResponse,
    SensorDataQueryParams,
)
from app.schemas.common import PaginatedResponse
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
    """Создание новой записи данных датчика"""
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
    """Создание нескольких записей данных датчика за один запрос"""
    sensor_data_list = await create_sensor_data_batch(data)
    return sensor_data_list


@router.get("", response_model=PaginatedResponse[SensorDataResponse])
async def get_sensor_data(
    query_params: SensorDataQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """Получение данных датчиков с опциональной фильтрацией"""
    # Построение фильтра из параметров запроса
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

    # Получение данных с пагинацией
    items, total, page, size, pages = await paginate(
        SensorData.all().order_by("-timestamp"), pagination, filters
    )

    return PaginatedResponse[SensorDataResponse](
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get("/latest", response_model=List[SensorDataResponse])
async def get_latest_sensor_readings(
    sensor_type: Optional[SensorType] = Query(
        None, description="Фильтр по типу датчика"
    ),
    location_id: Optional[str] = Query(None, description="Фильтр по ID локации"),
    sensor_id: Optional[str] = Query(None, description="Фильтр по ID датчика"),
    current_user: User = Depends(get_current_user),
):
    """Получение последних показаний датчиков"""
    latest_data = await get_latest_sensor_data(sensor_type, location_id, sensor_id)
    return latest_data


@router.get("/{sensor_id}", response_model=List[SensorDataResponse])
async def get_sensor_data_by_id(
    sensor_id: str = Path(..., description="ID датчика"),
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    limit: int = Query(100, ge=1, le=1000, description="Количество записей"),
    current_user: User = Depends(get_current_user),
):
    """Получение данных для конкретного датчика"""
    # Построение запроса
    query = SensorData.filter(sensor_id=sensor_id).order_by("-timestamp")

    if start_date:
        query = query.filter(timestamp__gte=start_date)
    if end_date:
        query = query.filter(timestamp__lte=end_date)

    # Выполнение запроса
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
    """Создание нового порога срабатывания для датчика"""
    threshold = await create_sensor_threshold(data, current_user.id)
    return threshold


@router.get("/thresholds", response_model=List[SensorThresholdResponse])
async def list_sensor_thresholds(
    sensor_type: Optional[SensorType] = Query(
        None, description="Фильтр по типу датчика"
    ),
    active_only: bool = Query(True, description="Только активные пороги"),
    current_user: User = Depends(get_current_user),
):
    """Получение всех порогов срабатывания датчиков"""
    thresholds = await get_sensor_thresholds(sensor_type, active_only)
    return thresholds


@router.patch("/thresholds/{threshold_id}", response_model=SensorThresholdResponse)
async def update_threshold(
    threshold_id: int = Path(..., description="ID порога"),
    threshold_data: SensorThresholdUpdate = Depends(),
    current_user: User = Depends(get_manager_user),
):
    """Обновление порога срабатывания датчика"""
    threshold = await update_sensor_threshold(
        threshold_id=threshold_id,
        min_value=threshold_data.min_value,
        max_value=threshold_data.max_value,
        is_active=threshold_data.is_active,
    )
    return threshold
