from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class RobotType(str, Enum):
    DRONE = "drone"
    GROUND = "ground"
    MULTIPURPOSE = "multipurpose"


class RobotStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CHARGING = "charging"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class RobotCapability(str, Enum):
    MONITORING = "monitoring"
    SPRAYING = "spraying"
    SOIL_ANALYSIS = "soil_analysis"
    HARVESTING = "harvesting"
    PRUNING = "pruning"
    TRANSPORT = "transport"
    PLANTING = "planting"


class TaskStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Location(BaseModel):
    lat: float = Field(..., description="Широта")
    lng: float = Field(..., description="Долгота")


class RobotBase(BaseModel):
    """Базовая схема робота"""

    robot_id: str = Field(..., description="Уникальный идентификатор робота")
    name: str = Field(..., description="Название робота")
    type: RobotType = Field(..., description="Тип робота")


class RobotCreate(RobotBase):
    """Схема для создания робота"""

    capabilities: List[RobotCapability] = Field(
        default=[], description="Возможности робота"
    )
    location: Optional[Location] = Field(None, description="Текущее местоположение")
    software_version: str = Field(
        default="1.0.0", description="Версия программного обеспечения"
    )


class RobotUpdate(BaseModel):
    """Схема для обновления робота"""

    name: Optional[str] = Field(None, description="Название робота")
    status: Optional[RobotStatus] = Field(None, description="Статус робота")
    battery_level: Optional[float] = Field(None, description="Уровень заряда в %")
    location: Optional[Location] = Field(None, description="Текущее местоположение")
    capabilities: Optional[List[RobotCapability]] = Field(
        None, description="Возможности робота"
    )
    active_task: Optional[str] = Field(None, description="Текущая задача")
    last_maintenance: Optional[datetime] = Field(
        None, description="Дата последнего обслуживания"
    )
    software_version: Optional[str] = Field(
        None, description="Версия программного обеспечения"
    )


class RobotResponse(RobotBase):
    """Схема для ответа с информацией о роботе"""

    status: RobotStatus = Field(..., description="Статус робота")
    battery_level: float = Field(..., description="Уровень заряда в %")
    location: Optional[Location] = Field(None, description="Текущее местоположение")
    capabilities: List[RobotCapability] = Field(..., description="Возможности робота")
    active_task: Optional[str] = Field(None, description="Текущая задача")
    last_maintenance: Optional[datetime] = Field(
        None, description="Дата последнего обслуживания"
    )
    software_version: str = Field(..., description="Версия программного обеспечения")
    created_at: datetime = Field(..., description="Дата создания")
    updated_at: datetime = Field(..., description="Дата обновления")


class TaskBase(BaseModel):
    """Базовая схема задания"""

    task_name: str = Field(..., description="Название задания")
    capability: RobotCapability = Field(..., description="Требуемая возможность")
    scheduled_time: datetime = Field(
        ..., description="Запланированное время выполнения"
    )
    params: Dict[str, Any] = Field(default={}, description="Параметры задания")
    priority: int = Field(default=1, description="Приоритет (1-5)")


class TaskCreate(TaskBase):
    """Схема для создания задания"""

    robot_id: str = Field(..., description="ID робота для выполнения задания")


class TaskUpdate(BaseModel):
    """Схема для обновления задания"""

    task_name: Optional[str] = Field(None, description="Название задания")
    capability: Optional[RobotCapability] = Field(
        None, description="Требуемая возможность"
    )
    status: Optional[TaskStatus] = Field(None, description="Статус задания")
    scheduled_time: Optional[datetime] = Field(
        None, description="Запланированное время выполнения"
    )
    params: Optional[Dict[str, Any]] = Field(None, description="Параметры задания")
    priority: Optional[int] = Field(None, description="Приоритет (1-5)")
    result: Optional[Dict[str, Any]] = Field(None, description="Результат выполнения")


class TaskResponse(TaskBase):
    """Схема для ответа с информацией о задании"""

    id: int = Field(..., description="ID задания")
    robot: RobotBase = Field(..., description="Информация о роботе")
    status: TaskStatus = Field(..., description="Статус задания")
    start_time: Optional[datetime] = Field(None, description="Время начала выполнения")
    end_time: Optional[datetime] = Field(None, description="Время завершения")
    result: Optional[Dict[str, Any]] = Field(None, description="Результат выполнения")
    created_at: datetime = Field(..., description="Дата создания")
    updated_at: datetime = Field(..., description="Дата обновления")


class CommandRequest(BaseModel):
    """Схема для запроса выполнения команды"""

    command: str = Field(..., description="Команда для выполнения")
    params: Optional[Dict[str, Any]] = Field(None, description="Параметры команды")


class RobotCommandRequest(CommandRequest):
    """Схема для запроса выполнения команды конкретным роботом"""

    robot_id: str = Field(..., description="ID робота")


class GroupCommandRequest(CommandRequest):
    """Схема для запроса выполнения команды группой роботов"""

    robot_ids: Optional[List[str]] = Field(None, description="Список ID роботов")
    robot_type: Optional[RobotType] = Field(None, description="Тип роботов")


class CommandResponse(BaseModel):
    """Схема для ответа на выполнение команды"""

    success: bool = Field(..., description="Успешность выполнения")
    message: str = Field(..., description="Сообщение о результате")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Детали выполнения команды"
    )


class RobotQueryParams(BaseModel):
    """Схема для параметров запроса списка роботов"""

    type: Optional[RobotType] = Field(None, description="Фильтр по типу робота")
    status: Optional[RobotStatus] = Field(None, description="Фильтр по статусу робота")
    capability: Optional[RobotCapability] = Field(
        None, description="Фильтр по возможностям"
    )
    search: Optional[str] = Field(None, description="Поиск по названию или ID")


class TaskQueryParams(BaseModel):
    """Схема для параметров запроса списка заданий"""

    robot_id: Optional[str] = Field(None, description="Фильтр по ID робота")
    status: Optional[TaskStatus] = Field(None, description="Фильтр по статусу задания")
    capability: Optional[RobotCapability] = Field(
        None, description="Фильтр по возможностям"
    )
    start_date: Optional[datetime] = Field(None, description="Начальная дата")
    end_date: Optional[datetime] = Field(None, description="Конечная дата")
