from typing import Optional, Dict, Any, List
from datetime import datetime, date
from enum import Enum

from pydantic import BaseModel


class ReportTypeEnum(str, Enum):
    """Перечисление типов отчетов."""

    SENSOR_DATA = "sensor_data"
    FERTILIZER_APPLICATIONS = "fertilizer_applications"
    DEVICE_ACTIVITY = "device_activity"
    SYSTEM_ACTIVITY = "system_activity"
    CUSTOM = "custom"


class ReportFormatEnum(str, Enum):
    """Перечисление форматов отчетов."""

    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "xlsx"


class ReportStatusEnum(str, Enum):
    """Перечисление статусов отчетов."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Base report schema
class ReportBase(BaseModel):
    """Базовая схема для отчетов."""

    name: str
    report_type: ReportTypeEnum
    format: ReportFormatEnum = ReportFormatEnum.JSON
    parameters: Dict[str, Any]


# Schema for creating a report
class ReportCreate(ReportBase):
    """Схема для создания отчета."""

    pass


# Schema for updating a report
class ReportUpdate(BaseModel):
    """Схема для обновления отчета."""

    name: Optional[str] = None
    format: Optional[ReportFormatEnum] = None
    parameters: Optional[Dict[str, Any]] = None


# Schema for report response
class ReportResponse(ReportBase):
    """Схема ответа с отчетом."""

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
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Base report schedule schema
class ReportScheduleBase(BaseModel):
    """Базовая схема для расписания отчетов."""

    name: str
    report_type: ReportTypeEnum
    format: ReportFormatEnum = ReportFormatEnum.JSON
    parameters: Dict[str, Any]
    frequency: str
    recipients: Optional[List[str]] = None


# Schema for creating a report schedule
class ReportScheduleCreate(ReportScheduleBase):
    """Схема для создания расписания отчетов."""

    pass


# Schema for updating a report schedule
class ReportScheduleUpdate(BaseModel):
    """Схема для обновления расписания отчетов."""

    name: Optional[str] = None
    format: Optional[ReportFormatEnum] = None
    parameters: Optional[Dict[str, Any]] = None
    frequency: Optional[str] = None
    recipients: Optional[List[str]] = None
    is_active: Optional[bool] = None


# Schema for report schedule response
class ReportScheduleResponse(ReportScheduleBase):
    """Схема ответа с расписанием отчетов."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    is_active: bool

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Base report template schema
class ReportTemplateBase(BaseModel):
    """Базовая схема для шаблонов отчетов."""

    name: str
    type: ReportTypeEnum
    template: Dict[str, Any]
    description: Optional[str] = None
    is_default: bool = False


# Schema for creating a report template
class ReportTemplateCreate(ReportTemplateBase):
    """Схема для создания шаблона отчета."""

    pass


# Schema for updating a report template
class ReportTemplateUpdate(BaseModel):
    """Схема для обновления шаблона отчета."""

    name: Optional[str] = None
    type: Optional[ReportTypeEnum] = None
    template: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


# Schema for report template response
class ReportTemplateResponse(ReportTemplateBase):
    """Схема ответа с шаблоном отчета."""

    id: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        """Конфигурация модели Pydantic."""

        from_attributes = True


# Schema for report generation
class ReportGenerate(BaseModel):
    """Схема для генерации отчета."""

    title: str
    type: ReportTypeEnum
    template_id: Optional[int] = None
    start_date: date
    end_date: date
    parameters: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


# Schema for report query parameters
class ReportQueryParams(BaseModel):
    """Схема для параметров запроса отчетов."""

    type: Optional[ReportTypeEnum] = None
    status: Optional[ReportStatusEnum] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_by_id: Optional[int] = None
    tags: Optional[List[str]] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0

    class Config:
        """Конфигурация модели Pydantic."""

        extra = "ignore"
