from enum import Enum

from tortoise import fields
from tortoise.models import Model


class DeviceType(str, Enum):
    """
    Types of devices in the system.
    """

    IRRIGATION = "irrigation"
    FERTILIZER = "fertilizer"
    VENTILATION = "ventilation"
    LIGHTING = "lighting"
    TEMPERATURE_CONTROL = "temperature_control"
    SENSOR_STATION = "sensor_station"
    WEATHER_STATION = "weather_station"
    ROBOT = "robot"
    OTHER = "other"


class DeviceMode(str, Enum):
    """
    Operation modes for devices.
    """

    AUTO = "auto"
    MANUAL = "manual"
    SCHEDULE = "schedule"
    OFF = "off"
    MAINTENANCE = "maintenance"


class DeviceStatus(str, Enum):
    """
    Status of devices.
    """

    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    WARNING = "warning"
    MAINTENANCE = "maintenance"


class Device(Model):
    """
    Model for vineyard devices.
    """

    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100)
    device_id = fields.CharField(max_length=50, unique=True, index=True)
    type = fields.CharEnumField(DeviceType)
    location_id = fields.CharField(max_length=50, index=True)
    status = fields.CharEnumField(DeviceStatus, default=DeviceStatus.OFFLINE)
    mode = fields.CharEnumField(DeviceMode, default=DeviceMode.OFF)
    ip_address = fields.CharField(max_length=50, null=True)
    mac_address = fields.CharField(max_length=50, null=True)
    firmware_version = fields.CharField(max_length=50, null=True)
    last_seen = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    metadata = fields.JSONField(null=True)

    class Meta:
        """Metadata for the Device model."""

        table = "devices"

    def __str__(self) -> str:
        """String representation of the Device model."""
        return f"{self.name} ({self.device_id})"


class DeviceSettings(Model):
    """
    Model for device settings.
    """

    id = fields.IntField(pk=True)
    device = fields.ForeignKeyField("models.Device", related_name="settings")
    mode = fields.CharEnumField(DeviceMode)
    schedule = fields.JSONField(null=True)
    thresholds = fields.JSONField(null=True)
    parameters = fields.JSONField()
    created_by = fields.ForeignKeyField("models.User", related_name="device_settings")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    is_active = fields.BooleanField(default=True)

    class Meta:
        """Metadata for the DeviceSettings model."""

        table = "device_settings"

    def __str__(self) -> str:
        """String representation of the DeviceSettings model."""
        return f"Settings for {self.device.name} - {self.mode}"


class DeviceActionLog(Model):
    """
    Model for logging device actions.
    """

    id = fields.IntField(pk=True)
    device = fields.ForeignKeyField("models.Device", related_name="action_logs")
    action = fields.CharField(max_length=100)
    parameters = fields.JSONField(null=True)
    result = fields.JSONField(null=True)
    status = fields.CharField(max_length=20)
    timestamp = fields.DatetimeField(auto_now_add=True)
    initiated_by = fields.ForeignKeyField(
        "models.User", related_name="device_actions", null=True
    )
    source = fields.CharField(max_length=50)  # API, web, automation, schedule

    class Meta:
        """Metadata for the DeviceActionLog model."""

        table = "device_action_logs"

    def __str__(self) -> str:
        """String representation of the DeviceActionLog model."""
        return f"{self.device.name} - {self.action} at {self.timestamp}"
