from enum import Enum
from typing import List, Optional
from datetime import datetime

from tortoise import fields
from tortoise.models import Model

from app.models.user import User


class RobotType(str, Enum):
    """Типы роботов"""

    DRONE = "drone"
    GROUND = "ground"
    MULTIPURPOSE = "multipurpose"


class RobotStatus(str, Enum):
    """Статусы роботов"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    CHARGING = "charging"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class RobotCapability(str, Enum):
    """Возможности роботов"""

    MONITORING = "monitoring"
    SPRAYING = "spraying"
    SOIL_ANALYSIS = "soil_analysis"
    HARVESTING = "harvesting"
    PRUNING = "pruning"
    TRANSPORT = "transport"
    PLANTING = "planting"


class Robot(Model):
    """Модель робота/дрона"""

    id = fields.IntField(pk=True)
    robot_id = fields.CharField(max_length=50, unique=True)
    name = fields.CharField(max_length=100)
    type = fields.CharEnumField(RobotType)
    status = fields.CharEnumField(RobotStatus, default=RobotStatus.INACTIVE)
    battery_level = fields.FloatField(default=100.0)  # Уровень заряда в %
    location = fields.JSONField(default=dict)  # Координаты в формате {lat: x, lng: y}
    capabilities = fields.JSONField(default=list)  # Список возможностей
    active_task = fields.CharField(
        max_length=100, null=True
    )  # Текущая задача, если есть
    last_maintenance = fields.DatetimeField(null=True)  # Дата последнего обслуживания
    software_version = fields.CharField(max_length=20, default="1.0.0")  # Версия ПО
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    created_by = fields.ForeignKeyField("models.User", related_name="robots", null=True)

    class Meta:
        table = "robots"

    def __str__(self):
        return f"{self.name} ({self.robot_id})"


class TaskStatus(str, Enum):
    """Статусы задач"""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RobotTask(Model):
    """Модель задания для робота"""

    id = fields.IntField(pk=True)
    robot = fields.ForeignKeyField("models.Robot", related_name="tasks")
    task_name = fields.CharField(max_length=100)
    capability = fields.CharEnumField(RobotCapability)
    status = fields.CharEnumField(TaskStatus, default=TaskStatus.SCHEDULED)
    scheduled_time = fields.DatetimeField()
    params = fields.JSONField(default=dict)  # Параметры задачи
    start_time = fields.DatetimeField(null=True)  # Время начала выполнения
    end_time = fields.DatetimeField(null=True)  # Время завершения
    result = fields.JSONField(default=dict, null=True)  # Результат выполнения задачи
    priority = fields.IntField(default=1)  # Приоритет задачи (чем выше, тем важнее)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="robot_tasks", null=True
    )

    class Meta:
        table = "robot_tasks"

    def __str__(self):
        return f"{self.task_name} для {self.robot.name} ({self.scheduled_time})"


class RobotLog(Model):
    """Модель для логов работы робота"""

    id = fields.IntField(pk=True)
    robot = fields.ForeignKeyField("models.Robot", related_name="logs")
    task = fields.ForeignKeyField("models.RobotTask", related_name="logs", null=True)
    log_type = fields.CharField(max_length=50)  # Тип лога (info, warning, error)
    message = fields.TextField()
    timestamp = fields.DatetimeField()
    details = fields.JSONField(default=dict, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "robot_logs"

    def __str__(self):
        return f"{self.log_type}: {self.message} ({self.timestamp})"
