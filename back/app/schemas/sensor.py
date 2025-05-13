from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.models.sensor_data import SensorType, AlertType


class SensorTypeEnum(str, Enum):
    """Перечисление типов датчиков."""

    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    SOIL_MOISTURE = "soil_moisture"
    SOIL_TEMPERATURE = "soil_temperature"
    LIGHT = "light"
    PH = "ph"
    WIND_SPEED = "wind_speed"
    WIND_DIRECTION = "wind_direction"
    RAINFALL = "rainfall"
    CO2 = "co2"


# Base sensor data schema
class SensorDataBase(BaseModel):
    """Базовая схема для данных датчика."""

    sensor_id: str
    type: SensorTypeEnum
    value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for creating sensor data
class SensorDataCreate(BaseModel):
    """Схема для создания данных датчика"""

    sensor_id: str
    type: SensorType
    value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    user_id: Optional[int] = None
    status: Optional[str] = "normal"
    metadata: Optional[Dict[str, Any]] = {}


# Schema for updating sensor data
class SensorDataUpdate(BaseModel):
    """Схема для обновления данных датчика."""

    value: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for sensor data response
class SensorDataResponse(BaseModel):
    """Схема ответа с данными датчика"""

    id: int
    sensor_id: str
    type: str
    value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    status: str
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = {}
    user_id: Optional[int] = None


# Schema for batch sensor data creation
class SensorDataBatchCreate(BaseModel):
    """Схема для пакетного создания данных датчиков."""

    data: List[SensorDataCreate]


# Base threshold schema
class SensorThresholdBase(BaseModel):
    """Базовая схема для пороговых значений датчика."""

    sensor_type: SensorTypeEnum
    min_value: float
    max_value: float
    unit: str


# Schema for creating a threshold
class SensorThresholdCreate(SensorThresholdBase):
    """Схема для создания пороговых значений датчика."""

    pass


# Schema for updating a threshold
class SensorThresholdUpdate(BaseModel):
    """Схема для обновления пороговых значений датчика."""

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None


# Schema for threshold response
class SensorThresholdResponse(SensorThresholdBase):
    """Схема ответа с пороговыми значениями датчика."""

    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    created_by_id: Optional[int] = None

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Schema for sensor data query parameters
class SensorDataQueryParams(BaseModel):
    """Схема для параметров запроса данных датчика."""

    sensor_id: Optional[str] = None
    type: Optional[SensorTypeEnum] = None
    location_id: Optional[str] = None
    device_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Конфигурация модели Pydantic."""

        extra = "ignore"


class ThresholdResponse(BaseModel):
    """Схема ответа с пороговыми значениями"""

    id: str
    sensor_type: str
    min_value: float
    max_value: float
    unit: str
    is_active: bool


class SensorAlertCreate(BaseModel):
    """Схема для создания оповещений"""

    sensor_id: str
    sensor_type: SensorType
    alert_type: AlertType
    value: float
    threshold_value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    message: str
    user_id: Optional[int] = None
    is_active: bool = True


class SensorAlertResponse(BaseModel):
    """Схема ответа с оповещениями"""

    id: int
    sensor_id: str
    sensor_type: str
    alert_type: str
    value: float
    threshold_value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    message: str
    timestamp: datetime
    is_active: bool
    resolved_at: Optional[datetime] = None
    user_id: Optional[int] = None
