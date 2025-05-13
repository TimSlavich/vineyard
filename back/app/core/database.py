import os
from typing import List

from loguru import logger
from tortoise import Tortoise

from app.core.config import settings

# Формируем URL для подключения к SQLite
DB_URL = f"sqlite://{settings.DB_PATH}"

# Список моделей для Tortoise ORM
MODELS_LIST = [
    "app.models.user",
    "app.models.sensor_data",
    "app.models.fertilizer_application",
    "app.models.device_settings",
    "app.models.report",
    "aerich.models",
]

# Конфигурация Tortoise ORM для миграций Aerich
TORTOISE_ORM = {
    "connections": {"default": DB_URL},
    "apps": {
        "models": {
            "models": MODELS_LIST,
            "default_connection": "default",
        },
    },
}


async def init_db() -> None:
    """
    Инициализация подключения к базе данных.
    """
    await Tortoise.init(
        db_url=DB_URL,
        modules={"models": MODELS_LIST},
    )

    # Генерация схем только если БД не существует или в режиме отладки при первом запуске
    db_exists = (
        os.path.exists(settings.DB_PATH) and os.path.getsize(settings.DB_PATH) > 0
    )

    if not db_exists and settings.DEBUG:
        await Tortoise.generate_schemas()


async def close_db() -> None:
    """
    Закрытие подключения к базе данных.
    """
    await Tortoise.close_connections()
