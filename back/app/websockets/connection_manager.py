import json
from typing import Dict, List, Optional, Any

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger

from app.schemas.common import WebSocketMessage


class ConnectionManager:
    """
    Менеджер WebSocket-соединений.

    Управляет WebSocket-соединениями, группами и рассылкой сообщений.
    """

    def __init__(self):
        """Инициализация менеджера соединений."""
        # Все активные соединения
        self.active_connections: List[WebSocket] = []

        # Соединения по группам
        self.group_connections: Dict[str, List[WebSocket]] = {}

        # Соединения по пользователям
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
        groups: Optional[List[str]] = None,
    ) -> None:
        """
        Подключение WebSocket-клиента.

        Args:
            websocket: WebSocket-соединение
            user_id: ID пользователя для пользовательских соединений
            groups: Список групп для подключения
        """
        await websocket.accept()
        self.active_connections.append(websocket)

        # Добавление в пользовательские соединения если указан user_id
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

        # Добавление в группы если указаны
        if groups:
            for group in groups:
                await self.add_to_group(websocket, group)

    def disconnect(self, websocket: WebSocket) -> None:
        """
        Отключение WebSocket-клиента.

        Args:
            websocket: WebSocket-соединение для отключения
        """
        # Удаление из активных соединений
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # Удаление из пользовательских соединений
        for user_id, connections in list(self.user_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.user_connections[user_id]

        # Удаление из групповых соединений
        for group, connections in list(self.group_connections.items()):
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.group_connections[group]

    async def add_to_group(self, websocket: WebSocket, group: str) -> None:
        """
        Добавление WebSocket-соединения в группу.

        Args:
            websocket: WebSocket-соединение
            group: Имя группы для добавления
        """
        if group not in self.group_connections:
            self.group_connections[group] = []

        if websocket not in self.group_connections[group]:
            self.group_connections[group].append(websocket)

        logger.debug(
            f"WebSocket-клиент добавлен в группу '{group}'. Размер группы: {len(self.group_connections[group])}"
        )

    async def remove_from_group(self, websocket: WebSocket, group: str) -> None:
        """
        Удаление WebSocket-соединения из группы.

        Args:
            websocket: WebSocket-соединение
            group: Имя группы для удаления
        """
        if (
            group in self.group_connections
            and websocket in self.group_connections[group]
        ):
            self.group_connections[group].remove(websocket)

            # Очистка пустых групп
            if not self.group_connections[group]:
                del self.group_connections[group]

        logger.debug(f"WebSocket-клиент удален из группы '{group}'")

    async def send_personal_message(
        self, message: WebSocketMessage, websocket: WebSocket
    ) -> None:
        """
        Отправка сообщения конкретному WebSocket-соединению.

        Args:
            message: Сообщение для отправки
            websocket: WebSocket-соединение для отправки
        """
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as e:
            logger.error(f"Ошибка отправки персонального сообщения: {e}")
            # Соединение может быть разорвано, отключаем его
            self.disconnect(websocket)

    async def send_to_user(self, message: WebSocketMessage, user_id: int) -> None:
        """
        Отправка сообщения всем соединениям конкретного пользователя.

        Args:
            message: Сообщение для отправки
            user_id: ID пользователя для отправки
        """
        if user_id in self.user_connections:
            # Создаем копию списка для избежания изменений во время итерации
            for connection in self.user_connections[user_id][:]:
                try:
                    await connection.send_text(message.model_dump_json())
                except Exception as e:
                    logger.error(
                        f"Ошибка отправки сообщения пользователю {user_id}: {e}"
                    )
                    self.disconnect(connection)

    async def broadcast(self, message: WebSocketMessage) -> None:
        """
        Широковещательная рассылка сообщения всем подключенным клиентам.

        Args:
            message: Сообщение для рассылки
        """
        disconnected = []

        # Конвертация сообщения в JSON один раз
        message_json = message.model_dump_json()

        # Создаем копию списка для избежания изменений во время итерации
        for connection in self.active_connections[:]:
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Ошибка широковещательной рассылки: {e}")
                disconnected.append(connection)

        # Очистка отключенных клиентов
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast_to_group(self, message: WebSocketMessage, group: str) -> None:
        """
        Широковещательная рассылка сообщения клиентам в конкретной группе.

        Args:
            message: Сообщение для рассылки
            group: Имя группы для рассылки
        """
        if group not in self.group_connections:
            logger.debug(f"Соединения для группы '{group}' не найдены, создаем группу")
            self.group_connections[group] = []
            return

        disconnected = []
        connections_count = len(self.group_connections[group])

        if connections_count == 0:
            logger.debug(f"Группа '{group}' существует, но не имеет соединений")
            return

        # Проверка пользовательской группы для детального логирования
        is_user_group = group.startswith("user:")
        if is_user_group:
            user_id = group.split(":", 1)[1] if ":" in group else "unknown"
        else:
            logger.debug(f"Отправка сообщения типа '{message.type}' в группу '{group}'")

        # Конвертация сообщения в JSON один раз
        try:
            message_json = message.model_dump_json()
            logger.debug(
                f"[WebSocket] Подготовлено сообщение JSON для отправки в группу: {message_json[:200]}..."
            )
        except Exception as e:
            logger.error(f"[WebSocket] Ошибка сериализации сообщения: {e}")
            return

        # Счетчик успешных отправок
        success_count = 0

        # Создаем копию списка для избежания изменений во время итерации
        for connection in self.group_connections[group][:]:
            try:
                await connection.send_text(message_json)
                success_count += 1
            except WebSocketDisconnect:
                logger.warning(
                    f"[WebSocket] Соединение в группе '{group}' было разорвано при отправке"
                )
                disconnected.append(connection)
            except Exception as e:
                logger.error(
                    f"[WebSocket] Ошибка отправки сообщения в группу '{group}': {e}"
                )
                disconnected.append(connection)

        # Очистка отключенных клиентов
        for connection in disconnected:
            self.disconnect(connection)

        logger.debug(
            f"Отправлено сообщение в группу '{group}': {success_count} из {connections_count} соединений"
        )


# Создание глобального экземпляра менеджера соединений
manager = ConnectionManager()
