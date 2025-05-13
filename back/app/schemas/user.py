from typing import Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# Базовая схема пользователя
class UserBase(BaseModel):
    """Базовая схема для данных пользователя."""

    email: EmailStr
    username: str
    is_active: Optional[bool] = True
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = "new_user"
    sensor_count: Optional[int] = None
    is_admin: Optional[bool] = False


# Схема для создания пользователя
class UserCreate(UserBase):
    """Схема для создания нового пользователя."""

    password: str = Field(..., min_length=8)
    password_confirm: str


# Схема для обновления пользователя
class UserUpdate(BaseModel):
    """Схема для обновления данных пользователя."""

    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# Схема для аутентификации пользователя
class UserAuthenticate(BaseModel):
    """Схема для аутентификации пользователя."""

    username: str
    password: str


# Схема для ответа пользователя
class UserResponse(BaseModel):
    """Схема для ответов пользователя."""

    id: int
    email: EmailStr
    username: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    sensor_count: int
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        """Конфигурация Pydantic для парсинга объектов (ORM моделей)."""

        from_attributes = True


# Схема для ответа на токен
class TokenResponse(BaseModel):
    """Схема для ответа на JWT токен."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Схема для обновления токена
class TokenRefresh(BaseModel):
    """Схема для обновления JWT токена."""

    refresh_token: str


# Схема для изменения пароля
class PasswordChange(BaseModel):
    """Схема для изменения пароля."""

    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
