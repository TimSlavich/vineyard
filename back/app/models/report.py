from enum import Enum

from tortoise import fields
from tortoise.models import Model


class ReportType(str, Enum):
    """Типы отчетов"""

    SENSOR_DATA = "sensor_data"
    FERTILIZER_APPLICATIONS = "fertilizer_applications"
    DEVICE_ACTIVITY = "device_activity"
    SYSTEM_ACTIVITY = "system_activity"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    """Форматы отчетов"""

    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"


class ReportStatus(str, Enum):
    """Статусы отчетов"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Report(Model):
    """Модель отчетов"""

    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    report_type = fields.CharEnumField(ReportType)
    format = fields.CharEnumField(ReportFormat, default=ReportFormat.JSON)
    parameters = fields.JSONField()
    result = fields.JSONField(null=True)
    status = fields.CharEnumField(ReportStatus, default=ReportStatus.PENDING)
    error = fields.TextField(null=True)
    created_by = fields.ForeignKeyField("models.User", related_name="reports")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    completed_at = fields.DatetimeField(null=True)
    file_path = fields.CharField(max_length=255, null=True)
    is_scheduled = fields.BooleanField(default=False)
    schedule = fields.JSONField(null=True)

    class Meta:
        table = "reports"

    def __str__(self) -> str:
        return f"{self.name} ({self.report_type}) - {self.status}"


class ReportSchedule(Model):
    """Модель расписания отчетов"""

    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=255)
    report_type = fields.CharEnumField(ReportType)
    format = fields.CharEnumField(ReportFormat, default=ReportFormat.JSON)
    parameters = fields.JSONField()
    frequency = fields.CharField(max_length=50)  # daily, weekly, monthly, etc.
    recipients = fields.JSONField(null=True)  # List of email addresses
    is_active = fields.BooleanField(default=True)
    created_by = fields.ForeignKeyField("models.User", related_name="report_schedules")
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    last_run = fields.DatetimeField(null=True)
    next_run = fields.DatetimeField(null=True)

    class Meta:
        table = "report_schedules"

    def __str__(self) -> str:
        return f"{self.name} ({self.report_type}) - {self.frequency}"
