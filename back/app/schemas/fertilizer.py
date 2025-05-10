from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum

from pydantic import BaseModel, Field


class FertilizerTypeEnum(str, Enum):
    """Enumeration of fertilizer types."""

    NITROGEN = "nitrogen"
    PHOSPHORUS = "phosphorus"
    POTASSIUM = "potassium"
    ORGANIC = "organic"
    MICRONUTRIENT = "micronutrient"
    COMPOUND = "compound"
    FOLIAR = "foliar"
    CUSTOM = "custom"


class ApplicationMethodEnum(str, Enum):
    """Enumeration of application methods."""

    BROADCAST = "broadcast"
    DRIP = "drip"
    FERTIGATION = "fertigation"
    FOLIAR_SPRAY = "foliar_spray"
    INJECTION = "injection"
    MANUAL = "manual"
    AUTOMATED = "automated"


class ApplicationStatusEnum(str, Enum):
    """Enumeration of application status."""

    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


# Base fertilizer application schema
class FertilizerApplicationBase(BaseModel):
    """Base schema for fertilizer application."""

    fertilizer_type: FertilizerTypeEnum
    name: str
    application_date: datetime
    application_method: ApplicationMethodEnum
    amount: float
    unit: str
    location_id: str
    area_size: Optional[float] = None
    area_unit: Optional[str] = None
    notes: Optional[str] = None
    status: ApplicationStatusEnum = ApplicationStatusEnum.PLANNED
    nutrients_composition: Optional[Dict[str, Any]] = None
    weather_conditions: Optional[Dict[str, Any]] = None


# Schema for creating fertilizer application
class FertilizerApplicationCreate(FertilizerApplicationBase):
    """Schema for creating fertilizer application."""

    pass


# Schema for updating fertilizer application
class FertilizerApplicationUpdate(BaseModel):
    """Schema for updating fertilizer application."""

    fertilizer_type: Optional[FertilizerTypeEnum] = None
    name: Optional[str] = None
    application_date: Optional[datetime] = None
    application_method: Optional[ApplicationMethodEnum] = None
    amount: Optional[float] = None
    unit: Optional[str] = None
    location_id: Optional[str] = None
    area_size: Optional[float] = None
    area_unit: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ApplicationStatusEnum] = None
    completed_at: Optional[datetime] = None
    nutrients_composition: Optional[Dict[str, Any]] = None
    weather_conditions: Optional[Dict[str, Any]] = None


# Schema for fertilizer application response
class FertilizerApplicationResponse(FertilizerApplicationBase):
    """Schema for fertilizer application response."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Base fertilizer schedule schema
class FertilizerScheduleBase(BaseModel):
    """Base schema for fertilizer schedule."""

    name: str
    fertilizer_type: FertilizerTypeEnum
    start_date: date
    end_date: Optional[date] = None
    frequency: str
    application_method: ApplicationMethodEnum
    amount: float
    unit: str
    location_id: str
    description: Optional[str] = None


# Schema for creating fertilizer schedule
class FertilizerScheduleCreate(FertilizerScheduleBase):
    """Schema for creating fertilizer schedule."""

    pass


# Schema for updating fertilizer schedule
class FertilizerScheduleUpdate(BaseModel):
    """Schema for updating fertilizer schedule."""

    name: Optional[str] = None
    fertilizer_type: Optional[FertilizerTypeEnum] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    frequency: Optional[str] = None
    application_method: Optional[ApplicationMethodEnum] = None
    amount: Optional[float] = None
    unit: Optional[str] = None
    location_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# Schema for fertilizer schedule response
class FertilizerScheduleResponse(FertilizerScheduleBase):
    """Schema for fertilizer schedule response."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for fertilizer application query parameters
class FertilizerQueryParams(BaseModel):
    """Schema for fertilizer application query parameters."""

    fertilizer_type: Optional[FertilizerTypeEnum] = None
    location_id: Optional[str] = None
    status: Optional[ApplicationStatusEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Pydantic model configuration."""

        extra = "ignore"
