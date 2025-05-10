from enum import Enum

from tortoise import fields
from tortoise.models import Model


class FertilizerType(str, Enum):
    """
    Types of fertilizers.
    """

    NITROGEN = "nitrogen"
    PHOSPHORUS = "phosphorus"
    POTASSIUM = "potassium"
    ORGANIC = "organic"
    MICRONUTRIENT = "micronutrient"
    COMPOUND = "compound"
    FOLIAR = "foliar"
    CUSTOM = "custom"


class ApplicationMethod(str, Enum):
    """
    Methods of fertilizer application.
    """

    BROADCAST = "broadcast"
    DRIP = "drip"
    FERTIGATION = "fertigation"
    FOLIAR_SPRAY = "foliar_spray"
    INJECTION = "injection"
    MANUAL = "manual"
    AUTOMATED = "automated"


class ApplicationStatus(str, Enum):
    """
    Status of fertilizer application.
    """

    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class FertilizerApplication(Model):
    """
    Model for tracking fertilizer applications.
    """

    id = fields.IntField(pk=True)
    fertilizer_type = fields.CharEnumField(FertilizerType)
    name = fields.CharField(max_length=100)
    application_date = fields.DatetimeField()
    application_method = fields.CharEnumField(ApplicationMethod)
    amount = fields.FloatField()
    unit = fields.CharField(max_length=20)
    location_id = fields.CharField(max_length=50, index=True)
    area_size = fields.FloatField(null=True)
    area_unit = fields.CharField(max_length=20, null=True)
    notes = fields.TextField(null=True)
    status = fields.CharEnumField(ApplicationStatus, default=ApplicationStatus.PLANNED)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="fertilizer_applications"
    )
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    completed_at = fields.DatetimeField(null=True)
    nutrients_composition = fields.JSONField(null=True)
    weather_conditions = fields.JSONField(null=True)

    class Meta:
        """Metadata for the FertilizerApplication model."""

        table = "fertilizer_applications"

    def __str__(self) -> str:
        """String representation of the FertilizerApplication model."""
        return f"{self.name} ({self.fertilizer_type}) on {self.application_date.strftime('%Y-%m-%d')}"


class FertilizerSchedule(Model):
    """
    Model for scheduling fertilizer applications.
    """

    id = fields.IntField(pk=True)
    name = fields.CharField(max_length=100)
    fertilizer_type = fields.CharEnumField(FertilizerType)
    start_date = fields.DateField()
    end_date = fields.DateField(null=True)
    frequency = fields.CharField(
        max_length=50
    )  # daily, weekly, biweekly, monthly, etc.
    application_method = fields.CharEnumField(ApplicationMethod)
    amount = fields.FloatField()
    unit = fields.CharField(max_length=20)
    location_id = fields.CharField(max_length=50, index=True)
    is_active = fields.BooleanField(default=True)
    created_by = fields.ForeignKeyField(
        "models.User", related_name="fertilizer_schedules"
    )
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    description = fields.TextField(null=True)

    class Meta:
        """Metadata for the FertilizerSchedule model."""

        table = "fertilizer_schedules"

    def __str__(self) -> str:
        """String representation of the FertilizerSchedule model."""
        return f"{self.name}: {self.frequency} ({self.start_date} to {self.end_date or 'ongoing'})"
