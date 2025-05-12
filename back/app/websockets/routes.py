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
from pydantic import ValidationError
from tortoise.exceptions import DoesNotExist

from app.deps.auth import validate_token
from app.models.user import User
from app.schemas.common import WebSocketMessage
from app.websockets.connection_manager import manager
from app.services.sensor_simulator import SENSOR_RANGES, generate_and_save_sensor_data

# Создание WebSocket-маршрутизатора
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    groups: Optional[List[str]] = Query(None),
    user_id: Optional[int] = Query(None),
    special_request: Optional[str] = None,
):
    """
    Основная конечная точка WebSocket для работы с данными в реальном времени.

    Args:
        websocket: WebSocket-соединение
        token: JWT-токен для аутентификации (опционально)
        groups: Группы для подписки (опционально)
        user_id: ID пользователя для явной идентификации (опционально)
        special_request: Специальный запрос для обработки (опционально)
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

        # Если передан специальный запрос, обрабатываем его сразу
        if special_request == "get_thresholds":
            logger.info(
                f"Обработка специального запроса get_thresholds для пользователя {user_id}"
            )
            # Создаем и отправляем запрос на получение пороговых значений
            from app.models.sensor_data import (
                SensorAlertThreshold,
                SensorType,
            )
            from app.services.sensor_simulator import SENSOR_RANGES

            # Получаем пороговые значения из базы данных
            thresholds = await SensorAlertThreshold.filter(
                created_by_id=user_id, is_active=True
            )

            # Если пороговых значений нет в базе, создаем на основе диапазонов датчиков
            if not thresholds:
                logger.info(
                    f"Создание пороговых значений по умолчанию для пользователя {user_id}"
                )
                thresholds = []

                for sensor_type, range_data in SENSOR_RANGES.items():
                    # Устанавливаем пороги чуть ниже минимального и чуть выше максимального диапазона
                    # Это позволит генерировать оповещения при выходе за пределы нормального диапазона
                    min_value = (
                        range_data["min"]
                        - (range_data["max"] - range_data["min"]) * 0.1
                    )
                    max_value = (
                        range_data["max"]
                        + (range_data["max"] - range_data["min"]) * 0.1
                    )

                    # Создаем запись порогового значения
                    threshold = await SensorAlertThreshold.create(
                        sensor_type=sensor_type,
                        min_value=min_value,
                        max_value=max_value,
                        unit=range_data["unit"],
                        is_active=True,
                        created_by_id=user_id,
                    )
                    thresholds.append(threshold)

            # Подготавливаем данные для отправки
            thresholds_data = []
            for threshold in thresholds:
                thresholds_data.append(
                    {
                        "id": str(threshold.id),
                        "sensorType": threshold.sensor_type.value,
                        "min": threshold.min_value,
                        "max": threshold.max_value,
                        "unit": threshold.unit,
                        "isActive": threshold.is_active,
                    }
                )

            # Отправляем пороговые значения клиенту
            thresholds_message = WebSocketMessage(
                type="thresholds_data",
                data={
                    "thresholds": thresholds_data,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )
            await manager.send_personal_message(thresholds_message, websocket)

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

                    from app.services.sensor_simulator import (
                        generate_and_save_sensor_data,
                    )

                    if user_id:
                        try:
                            is_manual_request = msg_data.get("manual", True)
                            check_thresholds = not is_manual_request
                            data = await generate_and_save_sensor_data(
                                user_id, check_thresholds=check_thresholds
                            )
                            logger.info(
                                f"Сгенерировано {len(data)} показаний датчиков для пользователя {user_id}"
                            )
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

                    try:
                        # Отправляем простой ответ о работоспособности системы оповещений
                        confirm_message = WebSocketMessage(
                            type="request_completed",
                            data={
                                "status": "success",
                                "message": "Тестовое оповещение: система оповещений работает нормально",
                                "user_id": user_id,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(confirm_message, websocket)

                    except Exception as e:
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

                # Обработка запроса на получение пороговых значений
                elif msg_data.get("target") == "get_thresholds":
                    logger.info(f"Запрошены пороговые значения пользователем {user_id}")

                    try:
                        from app.models.sensor_data import (
                            SensorAlertThreshold,
                            SensorType,
                        )
                        from app.services.sensor_simulator import SENSOR_RANGES

                        # Получаем пороговые значения из базы данных
                        thresholds = await SensorAlertThreshold.filter(
                            created_by_id=user_id, is_active=True
                        )

                        # Если пороговых значений нет в базе, создаем на основе диапазонов датчиков
                        if not thresholds:
                            logger.info(
                                f"Создание пороговых значений по умолчанию для пользователя {user_id}"
                            )
                            thresholds = []

                            for sensor_type, range_data in SENSOR_RANGES.items():
                                # Устанавливаем пороги чуть ниже минимального и чуть выше максимального диапазона
                                # Это позволит генерировать оповещения при выходе за пределы нормального диапазона
                                min_value = (
                                    range_data["min"]
                                    - (range_data["max"] - range_data["min"]) * 0.1
                                )
                                max_value = (
                                    range_data["max"]
                                    + (range_data["max"] - range_data["min"]) * 0.1
                                )

                                # Создаем запись порогового значения
                                threshold = await SensorAlertThreshold.create(
                                    sensor_type=sensor_type,
                                    min_value=min_value,
                                    max_value=max_value,
                                    unit=range_data["unit"],
                                    is_active=True,
                                    created_by_id=user_id,
                                )
                                thresholds.append(threshold)

                        # Подготавливаем данные для отправки
                        thresholds_data = []
                        for threshold in thresholds:
                            thresholds_data.append(
                                {
                                    "id": str(threshold.id),
                                    "sensorType": threshold.sensor_type.value,
                                    "min": threshold.min_value,
                                    "max": threshold.max_value,
                                    "unit": threshold.unit,
                                    "isActive": threshold.is_active,
                                }
                            )

                        # Отправляем пороговые значения клиенту
                        thresholds_message = WebSocketMessage(
                            type="thresholds_data",
                            data={
                                "thresholds": thresholds_data,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(
                            thresholds_message, websocket
                        )

                        # Отправляем подтверждение
                        confirm_message = WebSocketMessage(
                            type="request_completed",
                            data={
                                "status": "success",
                                "message": f"Получено {len(thresholds_data)} пороговых значений",
                                "count": len(thresholds_data),
                                "user_id": user_id,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(confirm_message, websocket)

                    except Exception as e:
                        logger.error(f"Ошибка при получении пороговых значений: {e}")
                        error_message = WebSocketMessage(
                            type="system",
                            data={
                                "status": "error",
                                "message": f"Ошибка при получении пороговых значений: {str(e)}",
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(error_message, websocket)

                # Обработка запроса на сохранение пороговых значений
                elif msg_data.get("target") == "save_thresholds":
                    logger.info(
                        f"Запрошено сохранение пороговых значений пользователем {user_id}"
                    )

                    try:
                        from app.models.sensor_data import (
                            SensorAlertThreshold,
                            SensorType,
                        )

                        # Получаем пороговые значения из запроса
                        thresholds_data = msg_data.get("thresholds", [])

                        if not thresholds_data:
                            raise ValueError("Пороговые значения не предоставлены")

                        # Обновляем пороговые значения в базе данных
                        saved_count = 0
                        for threshold_data in thresholds_data:
                            threshold_id = threshold_data.get("id")
                            sensor_type_str = threshold_data.get("sensorType")
                            min_value = threshold_data.get("min")
                            max_value = threshold_data.get("max")
                            unit = threshold_data.get("unit")
                            is_active = threshold_data.get("isActive", True)

                            # Преобразуем строковый тип датчика в объект SensorType
                            try:
                                sensor_type = SensorType(sensor_type_str)
                            except ValueError:
                                logger.warning(
                                    f"Неизвестный тип датчика: {sensor_type_str}"
                                )
                                continue

                            # Если указан ID, обновляем существующее пороговое значение
                            if threshold_id and threshold_id != "new":
                                try:
                                    threshold = await SensorAlertThreshold.get(
                                        id=threshold_id
                                    )
                                    # Проверяем, что порог принадлежит текущему пользователю
                                    if threshold.created_by_id != user_id:
                                        logger.warning(
                                            f"Попытка изменить порог другого пользователя: {threshold_id}"
                                        )
                                        continue

                                    threshold.min_value = min_value
                                    threshold.max_value = max_value
                                    threshold.unit = unit
                                    threshold.is_active = is_active
                                    await threshold.save()
                                    saved_count += 1
                                except DoesNotExist:
                                    logger.warning(f"Порог не найден: {threshold_id}")
                                    continue
                            else:
                                # Создаем новое пороговое значение
                                await SensorAlertThreshold.create(
                                    sensor_type=sensor_type,
                                    min_value=min_value,
                                    max_value=max_value,
                                    unit=unit,
                                    is_active=is_active,
                                    created_by_id=user_id,
                                )
                                saved_count += 1

                        # Отправляем подтверждение
                        confirm_message = WebSocketMessage(
                            type="request_completed",
                            data={
                                "status": "success",
                                "message": f"Сохранено {saved_count} пороговых значений",
                                "count": saved_count,
                                "user_id": user_id,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(confirm_message, websocket)

                        # После сохранения отправляем обновленные пороговые значения
                        thresholds = await SensorAlertThreshold.filter(
                            created_by_id=user_id, is_active=True
                        )

                        thresholds_data = []
                        for threshold in thresholds:
                            thresholds_data.append(
                                {
                                    "id": str(threshold.id),
                                    "sensorType": threshold.sensor_type.value,
                                    "min": threshold.min_value,
                                    "max": threshold.max_value,
                                    "unit": threshold.unit,
                                    "isActive": threshold.is_active,
                                }
                            )

                        thresholds_message = WebSocketMessage(
                            type="thresholds_data",
                            data={
                                "thresholds": thresholds_data,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(
                            thresholds_message, websocket
                        )

                    except Exception as e:
                        logger.error(f"Ошибка при сохранении пороговых значений: {e}")
                        error_message = WebSocketMessage(
                            type="system",
                            data={
                                "status": "error",
                                "message": f"Ошибка при сохранении пороговых значений: {str(e)}",
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(error_message, websocket)

                # Обработка запроса на сброс пороговых значений
                elif msg_data.get("target") == "reset_thresholds":
                    logger.info(
                        f"Запрошен сброс пороговых значений пользователем {user_id}"
                    )

                    try:
                        from app.models.sensor_data import SensorAlertThreshold

                        # Удаляем все текущие пороговые значения пользователя
                        deleted_count = await SensorAlertThreshold.filter(
                            created_by_id=user_id
                        ).delete()

                        logger.info(
                            f"Удалено {deleted_count} пороговых значений пользователя {user_id}"
                        )

                        # Отправляем подтверждение
                        confirm_message = WebSocketMessage(
                            type="request_completed",
                            data={
                                "status": "success",
                                "message": f"Удалено {deleted_count} пороговых значений. При следующем запросе будут созданы новые значения по умолчанию.",
                                "count": deleted_count,
                                "user_id": user_id,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(confirm_message, websocket)

                        # После удаления сразу создаём новые пороги по умолчанию
                        from app.models.sensor_data import SensorType
                        from app.services.sensor_simulator import SENSOR_RANGES

                        # Создаем новые пороговые значения по умолчанию
                        thresholds = []
                        for sensor_type, range_data in SENSOR_RANGES.items():
                            # Устанавливаем пороги чуть ниже минимального и чуть выше максимального диапазона
                            min_value = (
                                range_data["min"]
                                - (range_data["max"] - range_data["min"]) * 0.1
                            )
                            max_value = (
                                range_data["max"]
                                + (range_data["max"] - range_data["min"]) * 0.1
                            )

                            # Создаем запись порогового значения
                            threshold = await SensorAlertThreshold.create(
                                sensor_type=sensor_type,
                                min_value=min_value,
                                max_value=max_value,
                                unit=range_data["unit"],
                                is_active=True,
                                created_by_id=user_id,
                            )
                            thresholds.append(threshold)

                        # Подготавливаем данные для отправки
                        thresholds_data = []
                        for threshold in thresholds:
                            thresholds_data.append(
                                {
                                    "id": str(threshold.id),
                                    "sensorType": threshold.sensor_type.value,
                                    "min": threshold.min_value,
                                    "max": threshold.max_value,
                                    "unit": threshold.unit,
                                    "isActive": threshold.is_active,
                                }
                            )

                        # Отправляем пороговые значения клиенту
                        thresholds_message = WebSocketMessage(
                            type="thresholds_data",
                            data={
                                "thresholds": thresholds_data,
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(
                            thresholds_message, websocket
                        )

                    except Exception as e:
                        logger.error(f"Ошибка при сбросе пороговых значений: {e}")
                        error_message = WebSocketMessage(
                            type="system",
                            data={
                                "status": "error",
                                "message": f"Ошибка при сбросе пороговых значений: {str(e)}",
                                "timestamp": datetime.utcnow().isoformat(),
                            },
                        )
                        await manager.send_personal_message(error_message, websocket)
                else:
                    # Игнорируем все остальные типы request_data
                    pass

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
