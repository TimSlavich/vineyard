from enum import Enum

from tortoise import fields
from tortoise.models import Model


class SensorType(str, Enum):
    """Типы датчиков в системе"""

    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    SOIL_MOISTURE = "soil_moisture"
    SOIL_TEMPERATURE = "soil_temperature"
    LIGHT = "light"
    PH = "ph"
    WIND_SPEED = "wind_speed"
    WIND_DIRECTION = "wind_direction"
    RAINFALL = "rainfall"
    CO2 = "co2"


class SensorData(Model):
    """Модель данных с датчиков"""

    id = fields.IntField(pk=True)
    sensor_id = fields.CharField(max_length=255, index=True)
    type = fields.CharEnumField(SensorType, index=True)
    value = fields.FloatField()
    unit = fields.CharField(max_length=50)
    location_id = fields.CharField(max_length=255, index=True)
    device_id = fields.CharField(max_length=255, null=True)
    status = fields.CharField(max_length=50, default="normal")
    timestamp = fields.DatetimeField(auto_now_add=True, index=True)
    metadata = fields.JSONField(default={})
    user_id = fields.IntField(index=True, null=True)

    class Meta:
        table = "sensor_data"
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"{self.sensor_id} ({self.type}): {self.value} {self.unit} at {self.timestamp}"


class SensorAlertThreshold(Model):
    """Модель пороговых значений для оповещений"""

    id = fields.IntField(pk=True)
    sensor_type = fields.CharEnumField(SensorType, index=True)
    min_value = fields.FloatField()
    max_value = fields.FloatField()
    unit = fields.CharField(max_length=50)
    is_active = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    created_by = fields.ForeignKeyField(
        "models.User", on_delete=fields.SET_NULL, null=True
    )

    class Meta:
        table = "sensor_alert_thresholds"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.sensor_type}: {self.min_value} - {self.max_value} {self.unit}"
