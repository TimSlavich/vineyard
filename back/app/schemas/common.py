from typing import Optional, Dict, Any, List, Generic, TypeVar
from datetime import datetime

from pydantic import BaseModel, Field


class StatusMessage(BaseModel):
    """Схема для ответов на сообщения о состоянии."""

    status: str
    message: str


class ErrorResponse(BaseModel):
    """Схема для API ошибок."""

    status: str = "error"
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SuccessResponse(BaseModel):
    """Схема для API успешных ответов."""

    status: str = "success"
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Универсальный тип для пагинации
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Универсальная схема для ответов на пагинацию.

    Attributes:
        items: Список элементов на странице
        total: Общее количество элементов
        page: Номер текущей страницы
        size: Размер страницы
        pages: Общее количество страниц
    """

    items: List[T]
    total: int
    page: int
    size: int
    pages: int

    class Config:
        """Конфигурация Pydantic модели."""

        from_attributes = True


class WebSocketMessage(BaseModel):
    """Схема для WebSocket сообщений."""

    type: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
