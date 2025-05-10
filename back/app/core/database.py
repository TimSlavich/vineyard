from typing import Dict, List

from loguru import logger
from tortoise import Tortoise

from app.core.config import settings

# Формируем URL для подключения к SQLite
DB_URL = f"sqlite://{settings.DB_PATH}"

# Models list for Tortoise ORM
MODELS_LIST = [
    "app.models.user",
    "app.models.sensor_data",
    "app.models.fertilizer_application",
    "app.models.device_settings",
    "app.models.report",
    "aerich.models",
]

# Tortoise ORM config for Aerich migrations
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
    Initialize the database connection.
    """
    logger.info("Initializing database connection...")
    logger.info(f"Using SQLite database: {settings.DB_PATH}")

    await Tortoise.init(
        db_url=DB_URL,
        modules={"models": MODELS_LIST},
    )

    # Generate schemas if app is in debug mode
    if settings.DEBUG:
        logger.info("Generating database schema...")
        await Tortoise.generate_schemas()

    logger.info("Database connection initialized successfully!")


async def close_db() -> None:
    """
    Close the database connection.
    """
    logger.info("Closing database connection...")
    await Tortoise.close_connections()
    logger.info("Database connection closed successfully!")
