from typing import Any, Dict, Generic, List, Optional, Tuple, Type, TypeVar

from fastapi import Depends, Query
from pydantic import BaseModel
from tortoise.models import Model
from tortoise.queryset import QuerySet

from app.schemas.common import PaginatedResponse


# Generic type for Tortoise ORM models
T = TypeVar("T", bound=Model)

# Generic type for Pydantic models
P = TypeVar("P", bound=BaseModel)


class PaginationParams:
    """
    Pagination parameters for API endpoints.
    """

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        size: int = Query(20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.size = size
        self.offset = (page - 1) * size


async def paginate(
    query_set: QuerySet[T],
    pagination: PaginationParams = Depends(),
    filters: Optional[Dict[str, Any]] = None,
) -> Tuple[List[T], int, int, int, int]:
    """
    Paginate and filter a Tortoise ORM queryset.

    Args:
        query_set: The base queryset to paginate
        pagination: Pagination parameters
        filters: Optional filters to apply

    Returns:
        Tuple containing:
            - List of paginated models
            - Total count
            - Current page
            - Page size
            - Total pages
    """
    # Apply filters if provided
    filtered_qs = query_set.filter(**filters) if filters else query_set

    # Get total count
    total = await filtered_qs.count()

    # Calculate total pages
    pages = max((total + pagination.size - 1) // pagination.size, 0)

    # Get paginated items
    items = await filtered_qs.offset(pagination.offset).limit(pagination.size)

    return items, total, pagination.page, pagination.size, pages


def create_paginated_response(
    model_cls: Type[P],
    items: List[T],
    total: int,
    page: int,
    size: int,
    pages: int,
) -> PaginatedResponse[P]:
    """
    Create a paginated response from ORM models.

    Args:
        model_cls: Pydantic model class for response items
        items: List of ORM models
        total: Total count
        page: Current page
        size: Page size
        pages: Total pages

    Returns:
        PaginatedResponse containing serialized items and pagination metadata
    """
    return PaginatedResponse[model_cls](
        items=[model_cls.from_orm(item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )
