from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Query,
    Depends,
    HTTPException,
    status,
)
from loguru import logger

from app.deps.auth import validate_token
from app.models.user import User
from app.schemas.common import WebSocketMessage
from app.websockets.connection_manager import manager

# Create WebSocket router
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    groups: Optional[List[str]] = Query(None),
):
    """
    WebSocket endpoint for real-time data.

    Args:
        websocket: The WebSocket connection
        token: Optional JWT token for authentication
        groups: Optional groups to join
    """
    user_id = None

    # Validate token if provided
    if token:
        try:
            payload = await validate_token(token)
            user_id = int(payload.get("sub"))

            # Check if user exists
            user = await User.get_or_none(id=user_id)
            if not user or not user.is_active:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

        except (HTTPException, ValueError) as e:
            logger.error(f"Invalid token in WebSocket connection: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Accept the connection
    await manager.connect(websocket, user_id, groups)

    try:
        # Send welcome message
        welcome_data = {
            "message": "Connected to VineGuard WebSocket server",
            "user_id": user_id,
            "groups": groups or [],
            "timestamp": datetime.utcnow().isoformat(),
        }
        welcome_message = WebSocketMessage(type="welcome", data=welcome_data)
        await manager.send_personal_message(welcome_message, websocket)

        # Listen for messages from the client
        while True:
            # Receive JSON data
            data = await websocket.receive_json()

            # Process received message
            msg_type = data.get("type", "unknown")
            msg_data = data.get("data", {})

            # Handle different message types
            if msg_type == "ping":
                # Respond to ping with pong
                pong_message = WebSocketMessage(
                    type="pong", data={"timestamp": datetime.utcnow().isoformat()}
                )
                await manager.send_personal_message(pong_message, websocket)

            elif msg_type == "subscribe":
                # Subscribe to additional groups
                if "groups" in msg_data and isinstance(msg_data["groups"], list):
                    for group in msg_data["groups"]:
                        await manager.add_to_group(websocket, group)

                    # Confirm subscription
                    confirm_message = WebSocketMessage(
                        type="subscribed", data={"groups": msg_data["groups"]}
                    )
                    await manager.send_personal_message(confirm_message, websocket)

            elif msg_type == "unsubscribe":
                # Unsubscribe from groups
                if "groups" in msg_data and isinstance(msg_data["groups"], list):
                    for group in msg_data["groups"]:
                        await manager.remove_from_group(websocket, group)

                    # Confirm unsubscription
                    confirm_message = WebSocketMessage(
                        type="unsubscribed", data={"groups": msg_data["groups"]}
                    )
                    await manager.send_personal_message(confirm_message, websocket)

            else:
                # Echo unknown message types back
                echo_message = WebSocketMessage(
                    type="echo",
                    data={
                        "original_type": msg_type,
                        "original_data": msg_data,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
                await manager.send_personal_message(echo_message, websocket)

    except WebSocketDisconnect:
        # Client disconnected
        manager.disconnect(websocket)

    except Exception as e:
        # Error in WebSocket communication
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@router.websocket("/ws/sensor-data")
async def sensor_data_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    sensor_types: Optional[List[str]] = Query(None),
    location_ids: Optional[List[str]] = Query(None),
):
    """
    WebSocket endpoint for sensor data real-time updates.

    Args:
        websocket: The WebSocket connection
        token: Optional JWT token for authentication
        sensor_types: Optional sensor types to filter data
        location_ids: Optional location IDs to filter data
    """
    # Prepare groups based on sensor types and locations
    groups = []

    if sensor_types:
        groups.extend([f"sensor:{sensor_type}" for sensor_type in sensor_types])
    else:
        groups.append("sensor:all")

    if location_ids:
        groups.extend([f"location:{location_id}" for location_id in location_ids])

    # Connect using the main WebSocket endpoint
    await websocket_endpoint(websocket, token, groups)


@router.websocket("/ws/device-events")
async def device_events_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    device_types: Optional[List[str]] = Query(None),
    device_ids: Optional[List[str]] = Query(None),
):
    """
    WebSocket endpoint for device events real-time updates.

    Args:
        websocket: The WebSocket connection
        token: Optional JWT token for authentication
        device_types: Optional device types to filter events
        device_ids: Optional device IDs to filter events
    """
    # Prepare groups based on device types and IDs
    groups = ["device:events"]

    if device_types:
        groups.extend([f"device-type:{device_type}" for device_type in device_types])

    if device_ids:
        groups.extend([f"device:{device_id}" for device_id in device_ids])

    # Connect using the main WebSocket endpoint
    await websocket_endpoint(websocket, token, groups)


@router.websocket("/ws/fertilizer-events")
async def fertilizer_events_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    location_ids: Optional[List[str]] = Query(None),
):
    """
    WebSocket endpoint for fertilizer application events.

    Args:
        websocket: The WebSocket connection
        token: Optional JWT token for authentication
        location_ids: Optional location IDs to filter events
    """
    # Prepare groups
    groups = ["fertilizer:events"]

    if location_ids:
        groups.extend(
            [f"fertilizer:location:{location_id}" for location_id in location_ids]
        )

    # Connect using the main WebSocket endpoint
    await websocket_endpoint(websocket, token, groups)
