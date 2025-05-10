from enum import Enum
from typing import Optional

from tortoise import fields
from tortoise.models import Model


class SensorType(str, Enum):
    """
    Types of sensors available in the system.
    """

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
    """
    Model to store sensor readings.
    """

    id = fields.IntField(pk=True)
    sensor_id = fields.CharField(max_length=50, index=True)
    type = fields.CharEnumField(SensorType)
    value = fields.FloatField()
    unit = fields.CharField(max_length=20)
    timestamp = fields.DatetimeField(auto_now_add=True, index=True)
    location_id = fields.CharField(max_length=50, index=True)
    status = fields.CharField(max_length=20, default="normal")
    device_id = fields.CharField(max_length=50, index=True, null=True)
    metadata = fields.JSONField(null=True)

    class Meta:
        """Metadata for the SensorData model."""

        table = "sensor_data"

    def __str__(self) -> str:
        """String representation of the SensorData model."""
        return f"{self.type} reading: {self.value} {self.unit} at {self.timestamp}"


class SensorAlertThreshold(Model):
    """
    Model to store threshold values for sensor alerts.
    """

    id = fields.IntField(pk=True)
    sensor_type = fields.CharEnumField(SensorType, index=True)
    min_value = fields.FloatField()
    max_value = fields.FloatField()
    unit = fields.CharField(max_length=20)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="thresholds", null=True
    )
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    is_active = fields.BooleanField(default=True)

    class Meta:
        """Metadata for the SensorAlertThreshold model."""

        table = "sensor_alert_thresholds"
        unique_together = (("sensor_type", "unit"),)

    def __str__(self) -> str:
        """String representation of the SensorAlertThreshold model."""
        return f"{self.sensor_type} threshold: {self.min_value} - {self.max_value} {self.unit}"
