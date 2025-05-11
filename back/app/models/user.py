from enum import Enum

from tortoise import fields
from tortoise.models import Model


class UserRole(str, Enum):
    """Роли пользователей"""

    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


class User(Model):
    """Модель пользователя для аутентификации и контроля доступа"""

    id = fields.IntField(pk=True)
    email = fields.CharField(max_length=255, unique=True, index=True)
    username = fields.CharField(max_length=50, unique=True, index=True)
    hashed_password = fields.CharField(max_length=255)
    first_name = fields.CharField(max_length=50, null=True)
    last_name = fields.CharField(max_length=50, null=True)
    role = fields.CharEnumField(UserRole, default=UserRole.VIEWER)
    is_active = fields.BooleanField(default=True)
    is_verified = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "users"

    def __str__(self) -> str:
        return f"{self.username} ({self.email})"

    @property
    def full_name(self) -> str:
        """Получить полное имя пользователя"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        if self.first_name:
            return self.first_name
        return self.username


class RefreshToken(Model):
    """Модель для хранения токенов обновления"""

    id = fields.IntField(pk=True)
    user = fields.ForeignKeyField("models.User", related_name="refresh_tokens")
    token = fields.CharField(max_length=255, unique=True, index=True)
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)
    is_revoked = fields.BooleanField(default=False)

    class Meta:
        table = "refresh_tokens"

    def __str__(self) -> str:
        return f"Token for {self.user.username}, expires at {self.expires_at}"
