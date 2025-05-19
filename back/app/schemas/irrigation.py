from typing import List, Optional
from datetime import datetime, time
from enum import Enum
from pydantic import BaseModel, Field


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class IrrigationSchedule(BaseModel):
    """Схема для расписания полива"""

    enabled: bool = Field(default=False, description="Статус расписания")
    start_time: str = Field(..., description="Время начала полива в формате HH:MM")
    duration: int = Field(..., description="Продолжительность полива в минутах")
    days: List[DayOfWeek] = Field(default=[], description="Дни недели для полива")


class IrrigationState(BaseModel):
    """Схема для состояния системы полива"""

    is_active: bool = Field(default=True, description="Активна ли система полива")
    current_moisture: float = Field(..., description="Текущий уровень влажности в %")
    threshold: float = Field(
        ..., description="Порог влажности для автоматического полива в %"
    )
    is_irrigating: bool = Field(
        default=False, description="Происходит ли полив в данный момент"
    )
    schedule: IrrigationSchedule = Field(..., description="Расписание полива")
    last_updated: datetime = Field(
        default_factory=datetime.utcnow, description="Время последнего обновления"
    )


class IrrigationZone(BaseModel):
    """Схема для зоны полива"""

    zone_id: str = Field(..., description="Идентификатор зоны")
    zone_name: str = Field(..., description="Название зоны")
    state: IrrigationState = Field(..., description="Состояние системы полива в зоне")


class IrrigationZoneUpdate(BaseModel):
    """Схема для обновления зоны полива"""

    is_active: Optional[bool] = Field(None, description="Активна ли система полива")
    threshold: Optional[float] = Field(
        None, description="Порог влажности для автоматического полива в %"
    )
    is_irrigating: Optional[bool] = Field(
        None, description="Происходит ли полив в данный момент"
    )
    schedule: Optional[IrrigationSchedule] = Field(
        None, description="Расписание полива"
    )


class IrrigationSystemState(BaseModel):
    """Схема для состояния всей системы полива"""

    zones: List[IrrigationZone] = Field(..., description="Список зон полива")
    last_updated: datetime = Field(
        default_factory=datetime.utcnow, description="Время последнего обновления"
    )


class MoistureDataPoint(BaseModel):
    """Схема для точки данных влажности"""

    timestamp: datetime
    value: float


class MoistureHistory(BaseModel):
    """Схема для истории влажности"""

    zone_id: str
    data: List[MoistureDataPoint]
