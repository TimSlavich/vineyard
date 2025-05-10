from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, validator


class SensorTypeEnum(str, Enum):
    """Enumeration of sensor types."""

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
    """Base schema for sensor data."""

    sensor_id: str
    type: SensorTypeEnum
    value: float
    unit: str
    location_id: str
    device_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for creating sensor data
class SensorDataCreate(SensorDataBase):
    """Schema for creating sensor data."""

    pass


# Schema for updating sensor data
class SensorDataUpdate(BaseModel):
    """Schema for updating sensor data."""

    value: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for sensor data response
class SensorDataResponse(SensorDataBase):
    """Schema for sensor data response."""

    id: int
    timestamp: datetime
    status: str

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for batch sensor data creation
class SensorDataBatchCreate(BaseModel):
    """Schema for batch creating sensor data."""

    data: List[SensorDataCreate]


# Base threshold schema
class SensorThresholdBase(BaseModel):
    """Base schema for sensor threshold."""

    sensor_type: SensorTypeEnum
    min_value: float
    max_value: float
    unit: str


# Schema for creating a threshold
class SensorThresholdCreate(SensorThresholdBase):
    """Schema for creating sensor threshold."""

    pass


# Schema for updating a threshold
class SensorThresholdUpdate(BaseModel):
    """Schema for updating sensor threshold."""

    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None


# Schema for threshold response
class SensorThresholdResponse(SensorThresholdBase):
    """Schema for sensor threshold response."""

    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    created_by_id: Optional[int] = None

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for sensor data query parameters
class SensorDataQueryParams(BaseModel):
    """Schema for sensor data query parameters."""

    sensor_id: Optional[str] = None
    type: Optional[SensorTypeEnum] = None
    location_id: Optional[str] = None
    device_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Pydantic model configuration."""

        extra = "ignore"
