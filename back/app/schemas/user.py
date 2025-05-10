from typing import Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# Base User schema
class UserBase(BaseModel):
    """Base schema for user data."""

    email: EmailStr
    username: str
    is_active: Optional[bool] = True
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = "viewer"


# Schema for creating a user
class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8)
    password_confirm: str


# Schema for updating a user
class UserUpdate(BaseModel):
    """Schema for updating user data."""

    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# Schema for user authentication
class UserAuthenticate(BaseModel):
    """Schema for user authentication."""

    username: str
    password: str


# Schema for user response
class UserResponse(UserBase):
    """Schema for user response data."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


# Schema for token response
class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Schema for token refresh
class TokenRefresh(BaseModel):
    """Schema for refreshing JWT token."""

    refresh_token: str


# Schema for password change
class PasswordChange(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str
