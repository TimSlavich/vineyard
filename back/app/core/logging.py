import logging
import sys
from pathlib import Path
from types import FrameType
from typing import cast

from loguru import logger

from app.core.config import settings


class InterceptHandler(logging.Handler):
    """
    Перехват стандартного логирования и перенаправление в loguru.

    См.: https://loguru.readthedocs.io/en/stable/overview.html#entirely-compatible-with-standard-logging
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Получение соответствующего уровня Loguru, если он существует
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Нахождение вызывающего кода, откуда произошло логируемое сообщение
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:  # type: ignore
            frame = cast(FrameType, frame.f_back)
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging() -> None:
    """
    Настройка логирования с использованием loguru.
    """
    # Удаление логгеров по умолчанию
    logger.remove()

    # Создание директории для логов, если она не существует
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    log_file_path = log_dir / "app.log"

    # Перехват всего в корневом логгере
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(settings.LOG_LEVEL)

    # Добавление обработчиков loguru
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": settings.LOG_LEVEL,
                "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            },
            {
                "sink": str(log_file_path),
                "level": "DEBUG",
                "rotation": "10 MB",
                "compression": "zip",
                "format": "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            },
        ]
    )

    # Явная установка уровней логирования для сторонних модулей
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
        _logger = logging.getLogger(logger_name)
        _logger.handlers = [InterceptHandler()]
        _logger.propagate = False

    logger.debug(f"Логирование настроено: {log_file_path.absolute()}")
