from tortoise import fields
from tortoise.models import Model
from enum import Enum

from app.models.device_settings import Device, DeviceType


class ActivityType(str, Enum):
    """Типы активности устройств"""

    DATA_COLLECTION = "data_collection"
    IRRIGATION = "irrigation"
    FERTILIZATION = "fertilization"
    CALIBRATION = "calibration"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    STATUS_CHANGE = "status_change"
    OTHER = "other"


class DeviceActivity(Model):
    """Модель для отслеживания активности устройств"""

    id = fields.IntField(pk=True)
    device_id = fields.IntField(index=True)
    activity_type = fields.CharEnumField(ActivityType, index=True)
    timestamp = fields.DatetimeField(auto_now_add=True, index=True)
    details = fields.JSONField(null=True)
    status = fields.CharField(max_length=50, default="success")
    user_id = fields.IntField(
        index=True, null=True
    )  # Пользователь, инициировавший активность

    class Meta:
        table = "device_activities"
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"Activity {self.activity_type} for device {self.device_id} at {self.timestamp}"
