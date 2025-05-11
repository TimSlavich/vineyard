from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


def setup_middlewares(app: FastAPI) -> None:
    """
    Настройка промежуточного ПО для FastAPI приложения.

    Args:
        app: Экземпляр приложения FastAPI
    """
    # Настройка CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Настройка промежуточного ПО для логирования
    app.add_middleware(LoggingMiddleware)

    # Добавление других промежуточных слоев здесь


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Промежуточное ПО для логирования запросов и ответов.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Обработка запроса и логирование информации.
        """
        path = request.url.path
        method = request.method

        # Пропуск логирования для эндпоинтов проверки работоспособности для уменьшения шума
        if path == "/" or path.startswith("/docs") or path.startswith("/redoc"):
            return await call_next(request)

        # Логирование запроса (только для не-служебных эндпоинтов)
        logger.debug(f"Запрос: {method} {path}")

        # Обработка запроса
        response = await call_next(request)

        # Логирование ответов с интересующими кодами статуса
        status_code = response.status_code
        if status_code >= 400:  # Логирование ошибок как предупреждения/ошибки
            log_level = "error" if status_code >= 500 else "warning"
            getattr(logger, log_level)(
                f"Ответ: {method} {path} - Статус: {status_code}"
            )
        else:
            logger.debug(f"Ответ: {method} {path} - Статус: {status_code}")

        return response
