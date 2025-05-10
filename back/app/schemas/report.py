from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum

from pydantic import BaseModel, Field


class ReportTypeEnum(str, Enum):
    """Enumeration of report types."""

    SENSOR_DATA = "sensor_data"
    FERTILIZER_APPLICATIONS = "fertilizer_applications"
    DEVICE_ACTIVITY = "device_activity"
    SYSTEM_ACTIVITY = "system_activity"
    CUSTOM = "custom"


class ReportFormatEnum(str, Enum):
    """Enumeration of report formats."""

    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"


class ReportStatusEnum(str, Enum):
    """Enumeration of report statuses."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Base report schema
class ReportBase(BaseModel):
    """Base schema for reports."""

    name: str
    report_type: ReportTypeEnum
    format: ReportFormatEnum = ReportFormatEnum.JSON
    parameters: Dict[str, Any]


# Schema for creating a report
class ReportCreate(ReportBase):
    """Schema for creating a report."""

    pass


# Schema for updating a report
class ReportUpdate(BaseModel):
    """Schema for updating a report."""

    name: Optional[str] = None
    format: Optional[ReportFormatEnum] = None
    parameters: Optional[Dict[str, Any]] = None


# Schema for report response
class ReportResponse(ReportBase):
    """Schema for report response."""

    id: int
    status: ReportStatusEnum
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    file_path: Optional[str] = None
    is_scheduled: bool

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Base report schedule schema
class ReportScheduleBase(BaseModel):
    """Base schema for report schedule."""

    name: str
    report_type: ReportTypeEnum
    format: ReportFormatEnum = ReportFormatEnum.JSON
    parameters: Dict[str, Any]
    frequency: str
    recipients: Optional[List[str]] = None


# Schema for creating a report schedule
class ReportScheduleCreate(ReportScheduleBase):
    """Schema for creating a report schedule."""

    pass


# Schema for updating a report schedule
class ReportScheduleUpdate(BaseModel):
    """Schema for updating a report schedule."""

    name: Optional[str] = None
    format: Optional[ReportFormatEnum] = None
    parameters: Optional[Dict[str, Any]] = None
    frequency: Optional[str] = None
    recipients: Optional[List[str]] = None
    is_active: Optional[bool] = None


# Schema for report schedule response
class ReportScheduleResponse(ReportScheduleBase):
    """Schema for report schedule response."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    is_active: bool

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Base report template schema
class ReportTemplateBase(BaseModel):
    """Base schema for report templates."""

    name: str
    type: ReportTypeEnum
    template: Dict[str, Any]
    description: Optional[str] = None
    is_default: bool = False


# Schema for creating a report template
class ReportTemplateCreate(ReportTemplateBase):
    """Schema for creating a report template."""

    pass


# Schema for updating a report template
class ReportTemplateUpdate(BaseModel):
    """Schema for updating a report template."""

    name: Optional[str] = None
    type: Optional[ReportTypeEnum] = None
    template: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


# Schema for report template response
class ReportTemplateResponse(ReportTemplateBase):
    """Schema for report template response."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for report generation
class ReportGenerate(BaseModel):
    """Schema for generating a report."""

    title: str
    type: ReportTypeEnum
    template_id: Optional[int] = None
    start_date: date
    end_date: date
    parameters: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


# Schema for report query parameters
class ReportQueryParams(BaseModel):
    """Schema for report query parameters."""

    type: Optional[ReportTypeEnum] = None
    status: Optional[ReportStatusEnum] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_by_id: Optional[int] = None
    tags: Optional[List[str]] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Pydantic model configuration."""
