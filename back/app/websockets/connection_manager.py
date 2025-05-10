import json
from typing import Dict, List, Optional, Any

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from app.schemas.common import WebSocketMessage


class ConnectionManager:
    """
    WebSocket connection manager.

    Handles WebSocket connections, groups, and message broadcasting.
    """

    def __init__(self):
        """Initialize the connection manager."""
        # All active connections
        self.active_connections: List[WebSocket] = []

        # Group-based connections
        self.group_connections: Dict[str, List[WebSocket]] = {}

        # User-based connections
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        groups: Optional[List[str]] = None,
    ) -> None:
        """
        Connect a WebSocket client.

        Args:
            websocket: The WebSocket connection
            user_id: Optional user ID for user-specific connections
            groups: Optional list of groups to join
        """
        await websocket.accept()
        self.active_connections.append(websocket)

        # Add to user connections if user_id is provided
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

        # Add to group connections if groups are provided
        if groups:
            for group in groups:
                await self.add_to_group(websocket, group)

        logger.info(
            f"WebSocket client connected. Active connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Disconnect a WebSocket client.

        Args:
            websocket: The WebSocket connection to disconnect
        """
        # Remove from active connections
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # Remove from user connections
        for user_id, connections in list(self.user_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.user_connections[user_id]

        # Remove from group connections
        for group, connections in list(self.group_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.group_connections[group]

        logger.info(
            f"WebSocket client disconnected. Active connections: {len(self.active_connections)}"
        )

    async def add_to_group(self, websocket: WebSocket, group: str) -> None:
        """
        Add a WebSocket connection to a group.

        Args:
            websocket: The WebSocket connection
            group: The group name to add the connection to
        """
        if group not in self.group_connections:
            self.group_connections[group] = []

        if websocket not in self.group_connections[group]:
            self.group_connections[group].append(websocket)

        logger.debug(
            f"Added WebSocket client to group '{group}'. Group size: {len(self.group_connections[group])}"
        )

    async def remove_from_group(self, websocket: WebSocket, group: str) -> None:
        """
        Remove a WebSocket connection from a group.

        Args:
            websocket: The WebSocket connection
            group: The group name to remove the connection from
        """
        if (
            group in self.group_connections
            and websocket in self.group_connections[group]
        ):
            self.group_connections[group].remove(websocket)

            # Clean up empty groups
            if not self.group_connections[group]:
                del self.group_connections[group]

        logger.debug(f"Removed WebSocket client from group '{group}'")

    async def send_personal_message(
        self, message: WebSocketMessage, websocket: WebSocket
    ) -> None:
        """
        Send a message to a specific WebSocket connection.

        Args:
            message: The message to send
            websocket: The WebSocket connection to send to
        """
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            # The connection might be broken, disconnect it
            self.disconnect(websocket)

    async def send_to_user(self, message: WebSocketMessage, user_id: int) -> None:
        """
        Send a message to all connections of a specific user.

        Args:
            message: The message to send
            user_id: The user ID to send to
        """
        if user_id in self.user_connections:
            for connection in self.user_connections[user_id][
                :
            ]:  # Create a copy to avoid modification during iteration
                try:
                    await connection.send_text(message.model_dump_json())
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    self.disconnect(connection)

    async def broadcast(self, message: WebSocketMessage) -> None:
        """
        Broadcast a message to all connected clients.

        Args:
            message: The message to broadcast
        """
        disconnected = []

        # Convert the message to JSON once
        message_json = message.model_dump_json()

        for connection in self.active_connections[
            :
        ]:  # Create a copy to avoid modification during iteration
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_to_group(self, message: WebSocketMessage, group: str) -> None:
        """
        Broadcast a message to all clients in a specific group.

        Args:
            message: The message to broadcast
            group: The group name to broadcast to
        """
        if group not in self.group_connections:
            logger.warning(f"Attempted to broadcast to non-existent group: {group}")
            return

        disconnected = []

        # Convert the message to JSON once
        message_json = message.model_dump_json()

        for connection in self.group_connections[group][
            :
        ]:  # Create a copy to avoid modification during iteration
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Error broadcasting to group {group}: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


# Create a global instance of the connection manager
manager = ConnectionManager()
