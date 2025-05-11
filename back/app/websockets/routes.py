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

# Создание WebSocket-маршрутизатора
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    groups: Optional[List[str]] = Query(None),
    user_id: Optional[int] = Query(None),
):
    """
    Основная конечная точка WebSocket для работы с данными в реальном времени.

    Args:
        websocket: WebSocket-соединение
        token: JWT-токен для аутентификации (опционально)
        groups: Группы для подписки (опционально)
        user_id: ID пользователя для явной идентификации (опционально)
    """
    auth_user_id = None

    # Проверка токена, если предоставлен
    if token:
        try:
            payload = await validate_token(token)
            auth_user_id = int(payload.get("sub"))

            # Проверка существования пользователя
            user = await User.get_or_none(id=auth_user_id)
            if not user or not user.is_active:
                logger.warning(
                    f"Пользователь {auth_user_id} не найден или неактивен. WebSocket-соединение отклонено."
                )
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

            logger.info(
                f"Аутентифицировано WebSocket-соединение для пользователя {auth_user_id}"
            )

            # Проверка соответствия user_id из токена и параметра
            if user_id is not None and user_id != auth_user_id:
                logger.warning(
                    f"Запрошенный user_id {user_id} не соответствует аутентифицированному пользователю {auth_user_id}. "
                    f"Используем ID аутентифицированного пользователя."
                )

            # Используем пользователя из токена
            user_id = auth_user_id
        except (HTTPException, ValueError) as e:
            logger.error(f"Недействительный токен в WebSocket-соединении: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Использование явно переданного user_id (для отладки)
    if not token and user_id is not None:
        logger.warning(
            f"Используем явно предоставленный user_id {user_id} без проверки токена - только для отладки"
        )

        # Проверка существования пользователя
        user = await User.get_or_none(id=user_id)
        if not user or not user.is_active:
            logger.warning(
                f"Явно указанный пользователь {user_id} не найден или неактивен. WebSocket-соединение отклонено."
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    # Добавление групп по умолчанию, если не указаны
    if groups is None:
        groups = []

    # Всегда добавляем группу sensor:all для получения данных со всех датчиков
    if "sensor:all" not in groups:
        groups.append("sensor:all")
        logger.debug(
            f"Автоматически добавлена группа sensor:all к WebSocket-соединению"
        )

    # Добавление группы для конкретного пользователя
    if user_id is not None:
        user_group = f"user:{user_id}"
        if user_group not in groups:
            groups.append(user_group)
            logger.info(
                f"Добавлена группа пользователя {user_group} к WebSocket-соединению. "
                f"Это гарантирует, что пользователь будет получать только свои данные."
            )

    # Принятие соединения
    await manager.connect(websocket, user_id, groups)
    logger.info(
        f"WebSocket-соединение принято. Пользователь: {user_id}, Группы: {groups}"
    )

    try:
        # Отправка приветственного сообщения
        welcome_data = {
            "message": "Подключено к WebSocket-серверу VineGuard",
            "user_id": user_id,
            "groups": groups or [],
            "timestamp": datetime.utcnow().isoformat(),
        }
        welcome_message = WebSocketMessage(type="welcome", data=welcome_data)
        await manager.send_personal_message(welcome_message, websocket)
        logger.debug(f"Отправлено приветственное сообщение клиенту: {welcome_data}")

        # Прослушивание сообщений от клиента
        while True:
            # Получение JSON-данных
            data = await websocket.receive_json()
            logger.debug(
                f"Получено WebSocket-сообщение от пользователя {user_id}: {data}"
            )

            # Обработка полученного сообщения
            msg_type = data.get("type", "unknown")
            msg_data = data.get("data", {})

            # Обработка различных типов сообщений
            if msg_type == "ping":
                # Ответ на ping сообщением pong
                pong_message = WebSocketMessage(
                    type="pong", data={"timestamp": datetime.utcnow().isoformat()}
                )
                await manager.send_personal_message(pong_message, websocket)
                logger.debug("Отправлен ответ pong на ping")

            elif msg_type == "subscribe":
                # Подписка на дополнительные группы
                if "groups" in msg_data and isinstance(msg_data["groups"], list):
                    for group in msg_data["groups"]:
                        await manager.add_to_group(websocket, group)
                        logger.debug(f"WebSocket-клиент подписан на группу: {group}")

                    # Подтверждение подписки
                    confirm_message = WebSocketMessage(
                        type="subscribed", data={"groups": msg_data["groups"]}
                    )
                    await manager.send_personal_message(confirm_message, websocket)
                    logger.debug(
                        f"Подтверждена подписка на группы: {msg_data['groups']}"
                    )

            elif msg_type == "unsubscribe":
                # Отписка от групп
                if "groups" in msg_data and isinstance(msg_data["groups"], list):
                    for group in msg_data["groups"]:
                        await manager.remove_from_group(websocket, group)
                        logger.debug(f"WebSocket-клиент отписан от группы: {group}")

                    # Подтверждение отписки
                    confirm_message = WebSocketMessage(
                        type="unsubscribed", data={"groups": msg_data["groups"]}
                    )
                    await manager.send_personal_message(confirm_message, websocket)
                    logger.debug(f"Подтверждена отписка от групп: {msg_data['groups']}")

            elif msg_type == "request_data":
                # Обработка запроса на обновление данных
                if msg_data.get("target") == "sensor_data":
                    logger.info(
                        f"Запрошено ручное обновление данных датчиков пользователем {user_id}"
                    )

                    # Импорт и вызов функции для генерации данных
                    from app.services.sensor_simulator import (
                        generate_and_save_sensor_data,
                    )

                    if user_id:
                        try:
                            # Генерация новых данных для пользователя
                            data = await generate_and_save_sensor_data(user_id)
                            logger.info(
                                f"Сгенерировано {len(data)} показаний датчиков для пользователя {user_id}"
                            )

                            # Отправка подтверждения
                            confirm_message = WebSocketMessage(
                                type="request_completed",
                                data={
                                    "status": "success",
                                    "message": f"Сгенерировано {len(data)} показаний датчиков",
                                    "count": len(data),
                                    "user_id": user_id,
                                    "timestamp": datetime.utcnow().isoformat(),
                                },
                            )
                            await manager.send_personal_message(
                                confirm_message, websocket
                            )
                        except Exception as e:
                            # Обработка ошибок при генерации данных
                            logger.error(f"Ошибка при генерации данных датчиков: {e}")
                            error_message = WebSocketMessage(
                                type="system",
                                data={
                                    "status": "error",
                                    "message": f"Ошибка при обновлении данных: {str(e)}",
                                    "timestamp": datetime.utcnow().isoformat(),
                                },
                            )
                            await manager.send_personal_message(
                                error_message, websocket
                            )

                # Обработка запроса тестового оповещения
                elif msg_data.get("target") == "test_alert":
                    logger.info(
                        f"Запрошено тестовое оповещение пользователем {user_id}"
                    )

                    # Получаем любое активное пороговое значение для создания тестового оповещения
                    from app.models.sensor_data import (
                        SensorAlertThreshold,
                        SensorType,
                        SensorData,
                    )

                    try:
                        # Получение актуального порога
                        threshold = await SensorAlertThreshold.filter(
                            is_active=True
                        ).first()

                        if not threshold:
                            # Если нет активных порогов, создадим тестовый
                            threshold = await SensorAlertThreshold.create(
                                sensor_type=SensorType.TEMPERATURE,
                                min_value=15.0,
                                max_value=30.0,
                                unit="°C",
                                is_active=True,
                                created_by_id=user_id,
                            )

                        # Создаем тестовые данные датчика
                        test_sensor_data = SensorData(
                            sensor_id=f"{user_id}_test_sensor",
                            type=threshold.sensor_type,
                            value=threshold.max_value + 5,  # Значение выше порога
                            unit=threshold.unit,
                            location_id="test_location",
                            device_id="test_device",
                            status="high",
                            user_id=user_id,
                        )

                        # Отправляем тестовое оповещение
                        from app.services.sensor import broadcast_sensor_alert

                        await broadcast_sensor_alert(
                            sensor_data=test_sensor_data,
                            threshold=threshold,
                            alert_type="high",
                            message=f"Тестове оповіщення: значення датчика {test_sensor_data.type.value} "
                            f"({test_sensor_data.value} {test_sensor_data.unit}) вище порогового "
                            f"({threshold.max_value} {threshold.unit})",
                        )

                        # Отправляем подтверждение
                        confirm_message = WebSocketMessage(
                            type="request_completed",
                            data={
                                "status": "success",
                                "message": "Тестовое оповещение отправлено",
                                "user_id": user_id,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(confirm_message, websocket)

                    except Exception as e:
                        # Обработка ошибок
                        logger.error(f"Ошибка при создании тестового оповещения: {e}")
                        error_message = WebSocketMessage(
                            type="system",
                            data={
                                "status": "error",
                                "message": f"Ошибка при создании тестового оповещения: {str(e)}",
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(error_message, websocket)

            else:
                # Эхо-ответ на неизвестные типы сообщений
                echo_message = WebSocketMessage(
                    type="echo",
                    data={
                        "original_type": msg_type,
                        "original_data": msg_data,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
                await manager.send_personal_message(echo_message, websocket)
                logger.debug(
                    f"Отправлен эхо-ответ на неизвестный тип сообщения: {msg_type}"
                )

    except WebSocketDisconnect:
        # Отключение клиента
        logger.info(
            f"WebSocket-клиент отключен. Пользователь: {user_id}, Группы: {groups}"
        )
        manager.disconnect(websocket)

    except Exception as e:
        # Ошибка WebSocket-коммуникации
        logger.error(f"Ошибка WebSocket: {e}")
        logger.exception("Подробная информация об ошибке WebSocket:")
        manager.disconnect(websocket)


@router.websocket("/ws/sensor-data")
async def sensor_data_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    sensor_types: Optional[List[str]] = Query(None),
    location_ids: Optional[List[str]] = Query(None),
):
    """
    Конечная точка WebSocket для обновлений данных датчиков в реальном времени.

    Args:
        websocket: WebSocket-соединение
        token: JWT-токен для аутентификации (опционально)
        sensor_types: Типы датчиков для фильтрации (опционально)
        location_ids: ID локаций для фильтрации (опционально)
    """
    # Подготовка групп на основе типов датчиков и локаций
    groups = []

    if sensor_types:
        groups.extend([f"sensor:{sensor_type}" for sensor_type in sensor_types])
    else:
        groups.append("sensor:all")

    if location_ids:
        groups.extend([f"location:{location_id}" for location_id in location_ids])

    # Подключение через основную конечную точку WebSocket
    await websocket_endpoint(websocket, token, groups)


@router.websocket("/ws/device-events")
async def device_events_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    device_types: Optional[List[str]] = Query(None),
    device_ids: Optional[List[str]] = Query(None),
):
    """
    Конечная точка WebSocket для обновлений событий устройств в реальном времени.

    Args:
        websocket: WebSocket-соединение
        token: JWT-токен для аутентификации (опционально)
        device_types: Типы устройств для фильтрации (опционально)
        device_ids: ID устройств для фильтрации (опционально)
    """
    # Подготовка групп на основе типов и ID устройств
    groups = ["device:events"]

    if device_types:
        groups.extend([f"device-type:{device_type}" for device_type in device_types])

    if device_ids:
        groups.extend([f"device:{device_id}" for device_id in device_ids])

    # Подключение через основную конечную точку WebSocket
    await websocket_endpoint(websocket, token, groups)


@router.websocket("/ws/fertilizer-events")
async def fertilizer_events_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    location_ids: Optional[List[str]] = Query(None),
):
    """
    Конечная точка WebSocket для событий внесения удобрений.

    Args:
        websocket: WebSocket-соединение
        token: JWT-токен для аутентификации (опционально)
        location_ids: ID локаций для фильтрации (опционально)
    """
    # Подготовка групп
    groups = ["fertilizer:events"]

    if location_ids:
        groups.extend(
            [f"fertilizer:location:{location_id}" for location_id in location_ids]
        )

    # Подключение через основную конечную точку WebSocket
    await websocket_endpoint(websocket, token, groups)
