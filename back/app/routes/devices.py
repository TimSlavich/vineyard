from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate, create_paginated_response
from app.models.user import User
from app.models.device_settings import (
    Device,
    DeviceSettings,
    DeviceActionLog,
    DeviceType,
    DeviceMode,
    DeviceStatus,
)
from app.schemas.device import (
    DeviceResponse,
    DeviceCreate,
    DeviceUpdate,
    DeviceSettingsResponse,
    DeviceSettingsCreate,
    DeviceSettingsUpdate,
    DeviceAction,
    DeviceActionResponse,
    DeviceQueryParams,
)
from app.schemas.common import PaginatedResponse, StatusMessage, SuccessResponse

# Create devices router
router = APIRouter()


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    data: DeviceCreate, current_user: User = Depends(get_manager_user)
):
    """
    Register a new device.
    """
    # Check if device with same ID already exists
    existing = await Device.filter(device_id=data.device_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with ID {data.device_id} already exists",
        )

    # Create device
    device = await Device.create(
        name=data.name,
        device_id=data.device_id,
        type=data.type,
        location_id=data.location_id,
        ip_address=data.ip_address,
        mac_address=data.mac_address,
        firmware_version=data.firmware_version,
        metadata=data.metadata,
        status=DeviceStatus.OFFLINE,
        mode=DeviceMode.OFF,
    )

    logger.info(f"Device created: {device.name} ({device.device_id})")
    return device


@router.get("", response_model=PaginatedResponse[DeviceResponse])
async def get_devices(
    query_params: DeviceQueryParams = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
):
    """
    Get all devices with optional filtering.
    """
    # Build filter dict from query params
    filters = {}

    if query_params.type:
        filters["type"] = query_params.type

    if query_params.location_id:
        filters["location_id"] = query_params.location_id

    if query_params.status:
        filters["status"] = query_params.status

    if query_params.mode:
        filters["mode"] = query_params.mode

    # Get paginated devices
    items, total, page, size, pages = await paginate(
        Device.all().order_by("name"), pagination, filters
    )

    # Return paginated response
    return PaginatedResponse[DeviceResponse](
        items=items, total=total, page=page, size=size, pages=pages
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific device by ID.
    """
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_data: DeviceUpdate,
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Update a device.
    """
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Update fields if provided
    update_data = device_data.dict(exclude_unset=True)
    if update_data:
        await device.update_from_dict(update_data).save()
        logger.info(f"Device updated: {device.name} ({device.device_id})")

    return device


@router.delete("/{device_id}", response_model=StatusMessage)
async def delete_device(
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Delete a device.
    """
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Delete device
    await device.delete()
    logger.info(f"Device deleted: {device.name} ({device.device_id})")

    return {"status": "success", "message": f"Device {device_id} deleted successfully"}


@router.post("/{device_id}/settings", response_model=DeviceSettingsResponse)
async def create_device_settings(
    data: DeviceSettingsCreate,
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Create settings for a device.
    """
    # Check if device exists
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Deactivate existing active settings
    await DeviceSettings.filter(device=device, is_active=True).update(is_active=False)

    # Create new settings
    settings = await DeviceSettings.create(
        device=device,
        mode=data.mode,
        parameters=data.parameters,
        schedule=data.schedule,
        thresholds=data.thresholds,
        created_by=current_user,
    )

    # Update device mode
    await device.update_from_dict({"mode": data.mode}).save()

    logger.info(f"Device settings created for: {device.name} ({device.device_id})")
    return settings


@router.get("/{device_id}/settings", response_model=List[DeviceSettingsResponse])
async def get_device_settings(
    device_id: str = Path(..., description="Device ID"),
    active_only: bool = Query(True, description="Get only active settings"),
    current_user: User = Depends(get_current_user),
):
    """
    Get settings for a device.
    """
    # Check if device exists
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Query settings
    query = DeviceSettings.filter(device=device)
    if active_only:
        query = query.filter(is_active=True)

    settings = await query.order_by("-created_at")
    return settings


@router.post("/{device_id}/actions", response_model=DeviceActionResponse)
async def execute_device_action(
    data: DeviceAction,
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Execute an action on a device.
    """
    # Check if device exists
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Check if device is online
    if device.status != DeviceStatus.ONLINE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device {device_id} is not online",
        )

    # Log the action
    action_log = await DeviceActionLog.create(
        device=device,
        action=data.action,
        parameters=data.parameters,
        status="pending",
        initiated_by=current_user,
        source="API",
    )

    # In a real application, here we would communicate with the device
    # For now, we'll just simulate a successful action
    result = {"success": True, "message": f"Action {data.action} executed successfully"}

    # Update action log with result
    await action_log.update_from_dict({"result": result, "status": "completed"}).save()

    logger.info(
        f"Action {data.action} executed on device: {device.name} ({device.device_id})"
    )

    return {
        "device_id": device_id,
        "action": data.action,
        "status": "completed",
        "result": result,
        "timestamp": action_log.timestamp,
    }


@router.get("/{device_id}/actions", response_model=List[DeviceActionResponse])
async def get_device_actions(
    device_id: str = Path(..., description="Device ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of actions to return"),
    current_user: User = Depends(get_current_user),
):
    """
    Get action history for a device.
    """
    # Check if device exists
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Get action logs
    action_logs = (
        await DeviceActionLog.filter(device=device).order_by("-timestamp").limit(limit)
    )

    # Transform to response format
    actions = [
        {
            "device_id": device_id,
            "action": log.action,
            "status": log.status,
            "result": log.result,
            "timestamp": log.timestamp,
        }
        for log in action_logs
    ]

    return actions


@router.post("/{device_id}/status", response_model=DeviceResponse)
async def update_device_status(
    status: DeviceStatus,
    device_id: str = Path(..., description="Device ID"),
    current_user: User = Depends(get_manager_user),
):
    """
    Update device status.
    """
    device = await Device.filter(device_id=device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device with ID {device_id} not found",
        )

    # Update status
    await device.update_from_dict({"status": status}).save()
    logger.info(
        f"Device status updated: {device.name} ({device.device_id}) -> {status}"
    )

    return device
