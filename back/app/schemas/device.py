from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class DeviceTypeEnum(str, Enum):
    """Перечисление типов устройств."""

    IRRIGATION = "irrigation"
    FERTILIZER = "fertilizer"
    VENTILATION = "ventilation"
    LIGHTING = "lighting"
    TEMPERATURE_CONTROL = "temperature_control"
    SENSOR_STATION = "sensor_station"
    WEATHER_STATION = "weather_station"
    ROBOT = "robot"
    OTHER = "other"


class DeviceModeEnum(str, Enum):
    """Перечисление режимов устройств."""

    AUTO = "auto"
    MANUAL = "manual"
    SCHEDULE = "schedule"
    OFF = "off"
    MAINTENANCE = "maintenance"


class DeviceStatusEnum(str, Enum):
    """Перечисление статусов устройств."""

    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    WARNING = "warning"
    MAINTENANCE = "maintenance"


# Base device schema
class DeviceBase(BaseModel):
    """Базовая схема для устройств."""

    name: str
    device_id: str
    type: DeviceTypeEnum
    location_id: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    firmware_version: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for creating a device
class DeviceCreate(DeviceBase):
    """Схема для создания устройства."""

    pass


# Schema for updating a device
class DeviceUpdate(BaseModel):
    """Схема для обновления устройства."""

    name: Optional[str] = None
    type: Optional[DeviceTypeEnum] = None
    location_id: Optional[str] = None
    status: Optional[DeviceStatusEnum] = None
    mode: Optional[DeviceModeEnum] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    firmware_version: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# Schema for device response
class DeviceResponse(DeviceBase):
    """Схема ответа с устройством."""

    id: int
    status: DeviceStatusEnum
    mode: DeviceModeEnum
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Base device settings schema
class DeviceSettingsBase(BaseModel):
    """Базовая схема для настроек устройства."""

    device_id: int
    mode: DeviceModeEnum
    parameters: Dict[str, Any]
    schedule: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None


# Schema for creating device settings
class DeviceSettingsCreate(DeviceSettingsBase):
    """Схема для создания настроек устройства."""

    pass


# Schema for updating device settings
class DeviceSettingsUpdate(BaseModel):
    """Схема для обновления настроек устройства."""

    mode: Optional[DeviceModeEnum] = None
    parameters: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


# Schema for device settings response
class DeviceSettingsResponse(DeviceSettingsBase):
    """Схема ответа с настройками устройства."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Schema for device action
class DeviceAction(BaseModel):
    """Схема для действия устройства."""

    action: str
    parameters: Optional[Dict[str, Any]] = None


# Schema for device action response
class DeviceActionResponse(BaseModel):
    """Схема ответа с действием устройства."""

    device_id: int
    action: str
    status: str
    result: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Schema for device query parameters
class DeviceQueryParams(BaseModel):
    """Схема для параметров запроса устройств."""

    type: Optional[DeviceTypeEnum] = None
    location_id: Optional[str] = None
    status: Optional[DeviceStatusEnum] = None
    mode: Optional[DeviceModeEnum] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Конфигурация модели Pydantic."""

        extra = "ignore"
