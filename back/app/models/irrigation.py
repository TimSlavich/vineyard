from enum import Enum
from typing import List, Optional
from datetime import datetime

from tortoise import fields
from tortoise.models import Model

from app.models.user import User


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class IrrigationZone(Model):
    """Модель зоны полива"""

    id = fields.IntField(pk=True)
    zone_id = fields.CharField(max_length=50, unique=True)
    zone_name = fields.CharField(max_length=100)
    is_active = fields.BooleanField(default=True)
    threshold = fields.FloatField(default=60.0)  # Порог влажности в %
    current_moisture = fields.FloatField(default=0.0)  # Текущая влажность в %
    is_irrigating = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="irrigation_zones", null=True
    )

    class Meta:
        table = "irrigation_zones"

    def __str__(self):
        return f"{self.zone_name} ({self.zone_id})"


class IrrigationSchedule(Model):
    """Модель расписания полива"""

    id = fields.IntField(pk=True)
    zone = fields.ForeignKeyField("models.IrrigationZone", related_name="schedules")
    enabled = fields.BooleanField(default=False)
    start_time = fields.CharField(max_length=5)  # Формат "HH:MM"
    duration = fields.IntField(default=30)  # Продолжительность в минутах
    days = fields.JSONField(default=list)  # Список дней недели
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "irrigation_schedules"

    def __str__(self):
        return f"Расписание для {self.zone.zone_name}"


class MoistureRecord(Model):
    """Модель записи влажности"""

    id = fields.IntField(pk=True)
    zone = fields.ForeignKeyField(
        "models.IrrigationZone", related_name="moisture_records"
    )
    value = fields.FloatField()  # Значение влажности
    timestamp = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "moisture_records"

    def __str__(self):
        return f"Влажность {self.value}% в {self.zone.zone_name} ({self.timestamp})"


class IrrigationEvent(Model):
    """Модель событий полива"""

    id = fields.IntField(pk=True)
    zone = fields.ForeignKeyField("models.IrrigationZone", related_name="events")
    start_time = fields.DatetimeField()
    end_time = fields.DatetimeField(null=True)
    duration = fields.IntField(null=True)  # Длительность в секундах
    triggered_by = fields.CharField(max_length=50)  # manual, schedule, auto
    status = fields.CharField(
        max_length=20, default="active"
    )  # active, completed, cancelled
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="irrigation_events", null=True
    )

    class Meta:
        table = "irrigation_events"

    def __str__(self):
        return f"Полив в {self.zone.zone_name} ({self.start_time})"
