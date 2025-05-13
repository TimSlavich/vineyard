import asyncio
import random
import math
from typing import Dict, List, Any
from datetime import datetime

from loguru import logger

from app.models.user import User
from app.services.sensor import (
    create_sensor_data,
    get_thresholds_for_user,
)
from app.models.sensor_data import (
    SensorData,
    SensorType,
)
from app.schemas.sensor import SensorDataCreate
from app.models.user import UserRole

# Глобальное хранилище для последних значений датчиков
# Структура: {user_id: {sensor_id: {type: last_value}}}
last_sensor_values: Dict[int, Dict[str, Dict[str, float]]] = {}

# Диапазоны и единицы измерения для разных типов датчиков
SENSOR_RANGES = {
    SensorType.TEMPERATURE: {"min": 15.0, "max": 35.0, "unit": "°C", "max_change": 0.5},
    SensorType.HUMIDITY: {"min": 40.0, "max": 95.0, "unit": "%", "max_change": 2.0},
    SensorType.SOIL_MOISTURE: {
        "min": 20.0,
        "max": 80.0,
        "unit": "%",
        "max_change": 1.5,
    },
    SensorType.SOIL_TEMPERATURE: {
        "min": 12.0,
        "max": 30.0,
        "unit": "°C",
        "max_change": 0.3,
    },
    SensorType.LIGHT: {
        "min": 0.0,
        "max": 100000.0,
        "unit": "lux",
        "max_change": 5000.0,
    },
    SensorType.PH: {"min": 5.5, "max": 8.0, "unit": "pH", "max_change": 0.1},
    SensorType.WIND_SPEED: {"min": 0.0, "max": 20.0, "unit": "m/s", "max_change": 2.0},
    SensorType.WIND_DIRECTION: {
        "min": 0.0,
        "max": 359.0,
        "unit": "degrees",
        "max_change": 20.0,
    },
    SensorType.RAINFALL: {"min": 0.0, "max": 50.0, "unit": "mm", "max_change": 5.0},
    SensorType.CO2: {"min": 300.0, "max": 1500.0, "unit": "ppm", "max_change": 50.0},
}

# Определение тенденций и сезонных паттернов
HOUR_PATTERNS = {
    SensorType.TEMPERATURE: lambda hour: math.sin(hour * math.pi / 12)
    * 5,  # Пик в полдень
    SensorType.HUMIDITY: lambda hour: -math.sin(hour * math.pi / 12)
    * 10,  # Минимум в полдень
    SensorType.LIGHT: lambda hour: (
        math.sin(hour * math.pi / 12) * 40000 if 6 <= hour <= 18 else 100
    ),  # Только днем
}


async def get_or_create_user_sensors(
    user_id: int, count_per_type: int = 2
) -> Dict[str, Dict[str, Any]]:
    """
    Получает или создает датчики для пользователя на основе его роли и sensor_count.

    Args:
        user_id: ID пользователя
        count_per_type: Количество датчиков каждого типа (будет ограничено общим количеством)

    Returns:
        Dict с информацией о датчиках пользователя
    """
    global last_sensor_values

    # Получение пользователя и его параметров
    user = await User.get(id=user_id)

    total_sensors = user.sensor_count

    logger.debug(
        f"Генерация датчиков для пользователя {user_id}, роль: {user.role}, всего датчиков: {total_sensors}"
    )

    # Проверка наличия датчиков для пользователя
    if user_id in last_sensor_values:
        user_sensors = {}
        for sensor_id, sensor_values in last_sensor_values[user_id].items():
            sensor_type_str = next(iter(sensor_values.keys()), None)
            if not sensor_type_str:
                continue

            sensor_type = None
            for st in SensorType:
                if st.value == sensor_type_str:
                    sensor_type = st
                    break

            if not sensor_type:
                continue

            ranges = SENSOR_RANGES[sensor_type]
            value = sensor_values[sensor_type_str]

            parts = sensor_id.split("_")
            location_num = int(parts[-1]) % 3 + 1 if len(parts) >= 3 else 1
            location_id = f"location_{user_id}_{location_num}"

            user_sensors[sensor_id] = {
                "type": sensor_type_str,
                "location_id": location_id,
                "value": value,
                "unit": ranges["unit"],
            }

        # Пересоздание датчиков при несоответствии количества
        if len(user_sensors) != total_sensors:
            last_sensor_values[user_id] = {}
            return await get_or_create_user_sensors(user_id, count_per_type)

        return user_sensors

    # Создание новых датчиков
    user_sensors = {}
    last_sensor_values[user_id] = {}

    # Определение количества датчиков каждого типа на основе общего количества
    sensors_per_type = max(1, min(count_per_type, total_sensors // len(SensorType)))
    remainder = total_sensors - sensors_per_type * len(SensorType)

    sensors_created = 0

    for sensor_type in SensorType:
        if sensors_created >= total_sensors:
            break

        # Распределение оставшихся датчиков поровну между типами
        current_type_count = sensors_per_type
        if remainder > 0:
            current_type_count += 1
            remainder -= 1

        # Убедимся, что не превышаем общее ограничение
        current_type_count = min(current_type_count, total_sensors - sensors_created)

        for i in range(1, current_type_count + 1):
            sensor_id = f"{user_id}_{sensor_type.value}_{i}"
            location_id = f"location_{user_id}_{i % 3 + 1}"

            ranges = SENSOR_RANGES[sensor_type]
            initial_value = random.uniform(ranges["min"], ranges["max"])

            if sensor_id not in last_sensor_values[user_id]:
                last_sensor_values[user_id][sensor_id] = {}

            last_sensor_values[user_id][sensor_id][sensor_type.value] = initial_value

            if sensor_id not in user_sensors:
                user_sensors[sensor_id] = {
                    "type": sensor_type.value,
                    "location_id": location_id,
                    "value": initial_value,
                    "unit": ranges["unit"],
                }

            sensors_created += 1
    return user_sensors


async def generate_sensor_value(
    user_id: int, sensor_id: str, sensor_type: SensorType, current_time: datetime = None
) -> float:
    """
    Генерирует новое значение датчика с учетом предыдущего значения и паттернов.

    Args:
        user_id: ID пользователя
        sensor_id: ID датчика
        sensor_type: Тип датчика
        current_time: Текущее время

    Returns:
        Новое значение датчика
    """
    global last_sensor_values

    # Получаем текущий час (0-23)
    current_hour = current_time.hour

    # Получаем диапазоны для этого типа датчика
    ranges = SENSOR_RANGES[sensor_type]

    # Получаем предыдущее значение или используем среднее, если нет предыдущего
    try:
        prev_value = last_sensor_values[user_id][sensor_id][sensor_type.value]
    except (KeyError, TypeError):
        # Если нет предыдущего значения, используем значение в середине диапазона
        prev_value = (ranges["min"] + ranges["max"]) / 2

    # Максимальное изменение от предыдущего значения
    max_change = ranges.get("max_change", (ranges["max"] - ranges["min"]) * 0.05)

    # Случайное изменение в пределах максимально допустимого
    change = random.uniform(-max_change, max_change)

    # Применяем суточный паттерн, если есть
    if sensor_type in HOUR_PATTERNS:
        pattern_change = HOUR_PATTERNS[sensor_type](current_hour)
        # Применяем только часть изменения от паттерна для плавного изменения
        change += pattern_change * 0.05

    # Вычисляем новое значение
    new_value = prev_value + change

    # Ограничиваем значение допустимым диапазоном
    new_value = max(ranges["min"], min(ranges["max"], new_value))

    # Обновление хранилища
    last_sensor_values[user_id][sensor_id][sensor_type.value] = new_value

    return new_value


async def generate_and_save_sensor_data(
    user_id: int, check_thresholds: bool = True
) -> List[Dict[str, Any]]:
    """
    Генерирует и сохраняет новые данные для датчиков пользователя.
    Логика оповещений удалена, добавлено только логирование превышения пороговых значений.

    Args:
        user_id: ID пользователя
        check_thresholds: Проверять ли пороговые значения

    Returns:
        Список сгенерированных данных датчиков
    """
    global last_sensor_values

    # Получение датчиков пользователя
    user_sensors = await get_or_create_user_sensors(user_id)
    if not user_sensors:
        logger.warning(f"Не найдены датчики для пользователя {user_id}")
        return []

    # Получаем пороговые значения для всех типов датчиков пользователя
    thresholds = await get_thresholds_for_user(user_id) if check_thresholds else {}

    # Генерация и сохранение данных
    created_data = []
    timestamp = datetime.utcnow()

    for sensor_id, sensor_info in user_sensors.items():
        if not isinstance(sensor_info, dict):
            logger.error(f"Неверный формат данных датчика: {sensor_id}, {sensor_info}")
            continue

        sensor_type_str = sensor_info.get("type")
        if not sensor_type_str:
            logger.error(f"Отсутствует тип датчика для: {sensor_id}")
            continue

        try:
            # Получаем объект SensorType из строки
            sensor_type = None
            for st in SensorType:
                if st.value == sensor_type_str:
                    sensor_type = st
                    break

            if not sensor_type:
                logger.error(f"Неизвестный тип датчика: {sensor_type_str}")
                continue

            # Получаем параметры датчика
            ranges = SENSOR_RANGES[sensor_type]
            unit = sensor_info.get("unit", ranges["unit"])
            location_id = sensor_info.get("location_id", f"location_{user_id}_1")

            # Генерируем значение с учетом предыдущих значений и паттернов
            value = await generate_sensor_value(
                user_id, sensor_id, sensor_type, timestamp
            )

            # Определяем статус на основе пороговых значений
            status = "normal"
            sensor_thresholds = (
                thresholds.get(sensor_type.value, None) if check_thresholds else None
            )

            if sensor_thresholds:
                if value > sensor_thresholds.max_value:
                    status = "high"
                elif value < sensor_thresholds.min_value:
                    status = "low"

            # Создание объекта данных
            data_obj = SensorDataCreate(
                sensor_id=sensor_id,
                type=sensor_type,
                value=value,
                unit=unit,
                location_id=location_id,
                device_id=f"device_{sensor_id}",
                user_id=user_id,
                status=status,
                metadata={"user_id": user_id},
            )

            # Сохранение в базу данных
            sensor_data = await create_sensor_data(data_obj)

            # Добавление в список созданных данных
            created_data.append(
                {
                    "id": sensor_data.id,
                    "sensor_id": sensor_id,
                    "type": sensor_type_str,
                    "value": value,
                    "unit": unit,
                    "timestamp": sensor_data.timestamp.isoformat(),
                    "status": status,
                    "location_id": location_id,
                }
            )


        except Exception as e:
            logger.error(
                f"Ошибка при генерации данных для датчика {sensor_id}: {str(e)}"
            )
            import traceback

            logger.error(f"Трассировка: {traceback.format_exc()}")

    return created_data


async def run_sensor_simulator():
    """
    Запускает симулятор датчиков для периодической генерации данных.
    """
    while True:
        try:
            users = await User.all()

            for user in users:
                try:
                    # Для автоматического обновления всегда включаем проверку порогов
                    created_data = await generate_and_save_sensor_data(
                        user.id, check_thresholds=True
                    )
                    logger.debug(
                        f"Сгенерировано {len(created_data)} показаний датчиков для пользователя {user.id}"
                    )
                except Exception as e:
                    logger.error(
                        f"Ошибка генерации данных датчиков для пользователя {user.id}: {str(e)}"
                    )
                    import traceback

                    logger.error(f"Трассировка: {traceback.format_exc()}")

            await asyncio.sleep(300)  # 5 минут

        except Exception as e:
            logger.error(f"Ошибка в симуляторе датчиков: {e}")
            import traceback

            logger.error(f"Трассировка: {traceback.format_exc()}")
            await asyncio.sleep(300)


async def start_sensor_simulator():
    """
    Запускает симулятор датчиков как фоновую задачу.

    Returns:
        Объект фоновой задачи
    """
    loop = asyncio.get_event_loop()

    # Генерация начальных данных
    try:
        users = await User.all()
        for user in users:
            await get_or_create_user_sensors(user.id)
            # При инициализации тоже включаем проверку порогов
            await generate_and_save_sensor_data(user.id, check_thresholds=True)
    except Exception as e:
        logger.error(f"Ошибка генерации начальных данных датчиков: {e}")

    # Запуск фоновой задачи
    task = loop.create_task(run_sensor_simulator())
    return task
