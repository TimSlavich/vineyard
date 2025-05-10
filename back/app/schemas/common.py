from typing import Optional, Dict, Any, List, Generic, TypeVar
from datetime import datetime

from pydantic import BaseModel, Field


class StatusMessage(BaseModel):
    """Schema for status message responses."""

    status: str
    message: str


class ErrorResponse(BaseModel):
    """Schema for API error responses."""

    status: str = "error"
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SuccessResponse(BaseModel):
    """Schema for API success responses."""

    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Generic type for pagination
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Generic schema for paginated responses.

    Attributes:
        items: List of paginated items
        total: Total count of items
        page: Current page number
        size: Page size
        pages: Total number of pages
    """

    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    class Config:
        """Pydantic model configuration."""

        from_attributes = True


class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""

    type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
