import asyncio
import random
import math
from typing import Dict, List, Any
from datetime import datetime

from loguru import logger

from app.models.sensor_data import SensorType, SensorData
from app.models.user import User
from app.services.sensor import create_sensor_data
from app.schemas.sensor import SensorDataCreate

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
    user_id: int, count_per_type: int = 2, total_sensors: int = 20
) -> Dict[str, Dict[str, Any]]:
    """
    Получает или создает датчики для пользователя.

    Args:
        user_id: ID пользователя
        count_per_type: Количество датчиков каждого типа
        total_sensors: Общее ограничение на количество датчиков

    Returns:
        Dict с информацией о датчиках пользователя
    """
    global last_sensor_values

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
            logger.info(
                f"Пересоздание датчиков для пользователя {user_id} (требуется: {total_sensors})"
            )
            last_sensor_values[user_id] = {}
            return await get_or_create_user_sensors(
                user_id, count_per_type, total_sensors
            )

        return user_sensors

    # Создание новых датчиков
    user_sensors = {}
    last_sensor_values[user_id] = {}

    sensors_created = 0
    for sensor_type in SensorType:
        if sensors_created >= total_sensors:
            break

        sensors_of_this_type = min(count_per_type, total_sensors - sensors_created)

        for i in range(1, sensors_of_this_type + 1):
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

    logger.info(f"Создано {len(user_sensors)} датчиков для пользователя {user_id}")
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

    # Проверка типа датчика
    if sensor_type not in SENSOR_RANGES:
        logger.error(f"Неподдерживаемый тип датчика: {sensor_type}")
        return 0.0

    ranges = SENSOR_RANGES[sensor_type]
    min_value = ranges["min"]
    max_value = ranges["max"]
    max_change = ranges["max_change"]

    # Получение предыдущего значения
    if (
        user_id not in last_sensor_values
        or sensor_id not in last_sensor_values[user_id]
        or sensor_type.value not in last_sensor_values[user_id][sensor_id]
    ):
        last_value = random.uniform(min_value, max_value)
        if user_id not in last_sensor_values:
            last_sensor_values[user_id] = {}
        if sensor_id not in last_sensor_values[user_id]:
            last_sensor_values[user_id][sensor_id] = {}
        last_sensor_values[user_id][sensor_id][sensor_type.value] = last_value
    else:
        last_value = last_sensor_values[user_id][sensor_id][sensor_type.value]

    # Применение суточного паттерна
    hour_adjustment = 0
    if current_time and sensor_type in HOUR_PATTERNS:
        hour = current_time.hour + current_time.minute / 60
        hour_adjustment = HOUR_PATTERNS[sensor_type](hour)

    # Генерация случайного изменения
    random_change = random.uniform(-max_change, max_change)

    # Расчет нового значения
    new_value = last_value + random_change + hour_adjustment * 0.1

    # Специальная логика для датчика освещенности
    if sensor_type == SensorType.LIGHT and current_time:
        hour = current_time.hour + current_time.minute / 60
        if hour < 6 or hour > 18:
            # Ночная освещенность
            new_value = random.uniform(50, 250)
        else:
            # Дневная освещенность
            hour_factor = 1.0 - abs(hour - 12) / 6
            base_value = 1000 + hour_factor * 49000
            new_value = base_value + random.uniform(-base_value * 0.2, base_value * 0.2)
            new_value = max(100, new_value)

    # Ограничение значения в пределах диапазона
    new_value = max(min_value, min(max_value, new_value))

    # Обновление хранилища
    last_sensor_values[user_id][sensor_id][sensor_type.value] = new_value

    return new_value


async def generate_and_save_sensor_data(user_id: int) -> List[SensorData]:
    """
    Генерирует и сохраняет новые данные датчиков для пользователя.

    Args:
        user_id: ID пользователя

    Returns:
        Список созданных записей данных датчиков
    """
    user_sensors = await get_or_create_user_sensors(user_id)
    created_data = []
    current_time = datetime.now()

    for sensor_id, sensor_info in user_sensors.items():
        sensor_type_str = sensor_info["type"]
        sensor_type = None

        for st in SensorType:
            if st.value == sensor_type_str:
                sensor_type = st
                break

        if not sensor_type:
            logger.error(f"Неизвестный тип датчика: {sensor_type_str}")
            continue

        # Генерация нового значения
        new_value = await generate_sensor_value(
            user_id, sensor_id, sensor_type, current_time
        )

        logger.debug(
            f"Генерация данных датчика: sensor_id={sensor_id}, user_id={user_id}, value={new_value}"
        )

        # Создание объекта данных
        sensor_data = SensorDataCreate(
            sensor_id=sensor_id,
            type=sensor_type,
            value=new_value,
            unit=SENSOR_RANGES[sensor_type]["unit"],
            location_id=sensor_info["location_id"],
            device_id=f"device_{user_id}_{sensor_id.split('_')[-1]}",
            metadata={"simulated": True},
            user_id=user_id,
        )

        # Сохранение данных
        created = await create_sensor_data(sensor_data)
        created_data.append(created)

    logger.info(
        f"Сгенерировано и сохранено {len(created_data)} показаний датчиков для пользователя {user_id}"
    )

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
                    created_data = await generate_and_save_sensor_data(user.id)
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
            await generate_and_save_sensor_data(user.id)
            logger.info(
                f"Сгенерированы начальные данные датчиков для пользователя {user.id}"
            )
    except Exception as e:
        logger.error(f"Ошибка генерации начальных данных датчиков: {e}")

    # Запуск фоновой задачи
    task = loop.create_task(run_sensor_simulator())
    return task
