from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DeviceTypeEnum(str, Enum):
    """Enumeration of device types."""

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
    """Enumeration of device modes."""

    AUTO = "auto"
    MANUAL = "manual"
    SCHEDULE = "schedule"
    OFF = "off"
    MAINTENANCE = "maintenance"


class DeviceStatusEnum(str, Enum):
    """Enumeration of device statuses."""

    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    WARNING = "warning"
    MAINTENANCE = "maintenance"


# Base device schema
class DeviceBase(BaseModel):
    """Base schema for devices."""

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
    """Schema for creating a device."""

    pass


# Schema for updating a device
class DeviceUpdate(BaseModel):
    """Schema for updating a device."""

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
    """Schema for device response."""

    id: int
    status: DeviceStatusEnum
    mode: DeviceModeEnum
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Base device settings schema
class DeviceSettingsBase(BaseModel):
    """Base schema for device settings."""

    device_id: int
    mode: DeviceModeEnum
    parameters: Dict[str, Any]
    schedule: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None


# Schema for creating device settings
class DeviceSettingsCreate(DeviceSettingsBase):
    """Schema for creating device settings."""

    pass


# Schema for updating device settings
class DeviceSettingsUpdate(BaseModel):
    """Schema for updating device settings."""

    mode: Optional[DeviceModeEnum] = None
    parameters: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    thresholds: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


# Schema for device settings response
class DeviceSettingsResponse(DeviceSettingsBase):
    """Schema for device settings response."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for device action
class DeviceAction(BaseModel):
    """Schema for device action."""

    action: str
    parameters: Optional[Dict[str, Any]] = None


# Schema for device action response
class DeviceActionResponse(BaseModel):
    """Schema for device action response."""

    device_id: int
    action: str
    status: str
    result: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for device query parameters
class DeviceQueryParams(BaseModel):
    """Schema for device query parameters."""

    type: Optional[DeviceTypeEnum] = None
    location_id: Optional[str] = None
    status: Optional[DeviceStatusEnum] = None
    mode: Optional[DeviceModeEnum] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Pydantic model configuration."""

        extra = "ignore"
