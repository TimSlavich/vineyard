from tortoise import fields
from tortoise.models import Model
from enum import Enum

from app.models.sensor_data import SensorType


class Sensor(Model):
    """Модель датчиков"""

    id = fields.IntField(pk=True)
    sensor_id = fields.CharField(max_length=255, unique=True, index=True)
    name = fields.CharField(max_length=100)
    type = fields.CharEnumField(SensorType, index=True)
    location_id = fields.CharField(max_length=255, index=True)
    unit = fields.CharField(max_length=50)
    status = fields.CharField(max_length=50, default="active")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    user_id = fields.IntField(index=True)

    class Meta:
        table = "sensors"

    def __str__(self) -> str:
        return f"{self.name} ({self.sensor_id}): {self.type}"
