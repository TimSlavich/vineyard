from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate, create_paginated_response
from app.models.user import User
from app.models.fertilizer_application import (
    FertilizerApplication,
    FertilizerSchedule,
    FertilizerType,
    ApplicationMethod,
    ApplicationStatus,
)
from app.schemas.fertilizer import (
    FertilizerApplicationResponse,
    FertilizerApplicationCreate,
    FertilizerApplicationUpdate,
    FertilizerScheduleResponse,
    FertilizerScheduleCreate,
    FertilizerScheduleUpdate,
    FertilizerQueryParams,
)
from app.schemas.common import PaginatedResponse, StatusMessage
from app.websockets.connection_manager import manager
from app.schemas.common import WebSocketMessage

# Create fertilizer router
router = APIRouter()


@router.post(
    "/applications",
    response_model=FertilizerApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_application(
    data: FertilizerApplicationCreate, current_user: User = Depends(get_manager_user)
):
    """
    Create a new fertilizer application record.
    """
    # Create application
    application = await FertilizerApplication.create(
        **data.dict(), created_by=current_user
    )

    logger.info(
        f"Fertilizer application created: {application.name} ({application.id})"
    )

    # Broadcast via WebSocket
    await broadcast_fertilizer_event(
        application, "fertilizer_application_created", current_user
    )

    return application


@router.get(
    "/applications", response_model=PaginatedResponse[FertilizerApplicationResponse]
)
async def get_applications(
    query_params: FertilizerQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """
    Get fertilizer applications with optional filtering.
    """
    # Build filter dict from query params
    filters = {}

    if query_params.fertilizer_type:
        filters["fertilizer_type"] = query_params.fertilizer_type

    if query_params.location_id:
        filters["location_id"] = query_params.location_id

    if query_params.status:
        filters["status"] = query_params.status

    if query_params.start_date:
        filters["application_date__gte"] = query_params.start_date

    if query_params.end_date:
        filters["application_date__lte"] = query_params.end_date

    # Get paginated applications
    items, total, page, size, pages = await paginate(
        FertilizerApplication.all().order_by("-application_date"),
        pagination,
        filters,
    )

    # Return paginated response
    return PaginatedResponse[FertilizerApplicationResponse](
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get(
    "/applications/{application_id}", response_model=FertilizerApplicationResponse
)
async def get_application(
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific fertilizer application by ID.
    """
    application = await FertilizerApplication.get_or_none(id=application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found",
        )

    return application


@router.patch(
    "/applications/{application_id}", response_model=FertilizerApplicationResponse
)
async def update_application(
    application_data: FertilizerApplicationUpdate,
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Update a fertilizer application.
    """
    application = await FertilizerApplication.get_or_none(id=application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found",
        )

    # Update fields if provided
    update_data = application_data.dict(exclude_unset=True)
    if update_data:
        # Check if status is being updated to completed
        was_completed = False
        if (
            "status" in update_data
            and update_data["status"] == ApplicationStatus.COMPLETED
            and application.status != ApplicationStatus.COMPLETED
        ):
            update_data["completed_at"] = datetime.utcnow()
            was_completed = True

        await application.update_from_dict(update_data).save()
        logger.info(f"Application updated: {application.name} ({application.id})")

        # Broadcast update via WebSocket
        event_type = (
            "fertilizer_application_completed"
            if was_completed
            else "fertilizer_application_updated"
        )
        await broadcast_fertilizer_event(application, event_type, current_user)

    return application


@router.delete("/applications/{application_id}", response_model=StatusMessage)
async def delete_application(
    application_id: int = Path(..., description="Application ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Delete a fertilizer application.
    """
    application = await FertilizerApplication.get_or_none(id=application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found",
        )

    # Store info for WebSocket notification
    app_info = {
        "id": application.id,
        "name": application.name,
        "location_id": application.location_id,
    }

    # Delete application
    await application.delete()
    logger.info(f"Application deleted: {app_info['name']} ({app_info['id']})")

    # Broadcast delete via WebSocket
    message = WebSocketMessage(
        type="fertilizer_application_deleted",
        data={
            "application": app_info,
            "user": {
                "id": current_user.id,
                "username": current_user.username,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
    await manager.broadcast_to_group(message, "fertilizer:events")
    await manager.broadcast_to_group(
        message, f"fertilizer:location:{app_info['location_id']}"
    )

    return {
        "status": "success",
        "message": f"Application {application_id} deleted successfully",
    }


# Fertilizer Schedules


@router.post(
    "/schedules",
    response_model=FertilizerScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_schedule(
    data: FertilizerScheduleCreate, current_user: User = Depends(get_manager_user)
):
    """
    Create a new fertilizer schedule.
    """
    # Create schedule
    schedule = await FertilizerSchedule.create(**data.dict(), created_by=current_user)

    logger.info(f"Fertilizer schedule created: {schedule.name} ({schedule.id})")

    return schedule


@router.get("/schedules", response_model=List[FertilizerScheduleResponse])
async def get_schedules(
    location_id: Optional[str] = Query(None, description="Filter by location ID"),
    active_only: bool = Query(True, description="Filter only active schedules"),
    current_user: User = Depends(get_current_user),
):
    """
    Get all fertilizer schedules.
    """
    query = FertilizerSchedule.all()

    if location_id:
        query = query.filter(location_id=location_id)

    if active_only:
        query = query.filter(is_active=True)

    schedules = await query.order_by("start_date")
    return schedules


@router.get("/schedules/{schedule_id}", response_model=FertilizerScheduleResponse)
async def get_schedule(
    schedule_id: int = Path(..., description="Schedule ID"),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific fertilizer schedule by ID.
    """
    schedule = await FertilizerSchedule.get_or_none(id=schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with ID {schedule_id} not found",
        )

    return schedule


@router.patch("/schedules/{schedule_id}", response_model=FertilizerScheduleResponse)
async def update_schedule(
    schedule_data: FertilizerScheduleUpdate,
    schedule_id: int = Path(..., description="Schedule ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Update a fertilizer schedule.
    """
    schedule = await FertilizerSchedule.get_or_none(id=schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with ID {schedule_id} not found",
        )

    # Update fields if provided
    update_data = schedule_data.dict(exclude_unset=True)
    if update_data:
        await schedule.update_from_dict(update_data).save()
        logger.info(f"Schedule updated: {schedule.name} ({schedule.id})")

    return schedule


@router.delete("/schedules/{schedule_id}", response_model=StatusMessage)
async def delete_schedule(
    schedule_id: int = Path(..., description="Schedule ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Delete a fertilizer schedule.
    """
    schedule = await FertilizerSchedule.get_or_none(id=schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with ID {schedule_id} not found",
        )

    # Delete schedule
    await schedule.delete()
    logger.info(f"Schedule deleted: {schedule.name} ({schedule.id})")

    return {
        "status": "success",
        "message": f"Schedule {schedule_id} deleted successfully",
    }


# Helper function for WebSocket notifications
async def broadcast_fertilizer_event(
    application: FertilizerApplication, event_type: str, user: User
):
    """
    Broadcast fertilizer event via WebSocket.

    Args:
        application: The application that triggered the event
        event_type: Type of event (created, updated, completed)
        user: User who triggered the event
    """
    message = WebSocketMessage(
        type=event_type,
        data={
            "application": {
                "id": application.id,
                "name": application.name,
                "fertilizer_type": application.fertilizer_type.value,
                "application_date": application.application_date.isoformat(),
                "status": application.status.value,
                "location_id": application.location_id,
            },
            "user": {
                "id": user.id,
                "username": user.username,
            },
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

    # Broadcast to fertilizer events group
    await manager.broadcast_to_group(message, "fertilizer:events")

    # Broadcast to location-specific group
    await manager.broadcast_to_group(
        message, f"fertilizer:location:{application.location_id}"
    )
