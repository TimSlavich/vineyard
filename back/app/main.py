import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging
from app.core.middlewares import setup_middlewares
from app.routes import api_router
from app.websockets.routes import router as websocket_router
from app.services.sensor_simulator import start_sensor_simulator


# Настройка логирования
setup_logging()

# Создание FastAPI приложения
app = FastAPI(
    title="VineGuard API",
    description="API для системы управления виноградниками",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Принудительно настраиваем CORS для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все origins для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка промежуточного ПО
setup_middlewares(app)

# Подключение маршрутизаторов
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)

# Переменная для хранения задачи симулятора
sensor_simulator_task = None


@app.on_event("startup")
async def startup_event():
    """
    Выполнение задач при запуске приложения.
    """
    logger.info("Запуск приложения...")

    # Инициализация подключения к базе данных
    await init_db()

    # Запуск симулятора датчиков как фоновую задачу
    global sensor_simulator_task
    logger.info("Запуск симулятора датчиков...")
    sensor_simulator_task = await start_sensor_simulator()
    logger.info("Симулятор датчиков успешно запущен.")

    logger.info("Запуск приложения завершен.")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Выполнение задач при остановке приложения.
    """
    logger.info("Остановка приложения...")

    # Остановка симулятора датчиков
    global sensor_simulator_task
    if sensor_simulator_task:
        logger.info("Остановка симулятора датчиков...")
        sensor_simulator_task.cancel()
        try:
            await sensor_simulator_task
        except asyncio.CancelledError:
            logger.info("Симулятор датчиков успешно остановлен.")

    # Закрытие подключения к базе данных
    await close_db()

    logger.info("Остановка приложения завершена.")


@app.get("/", tags=["Health"])
async def health_check():
    """
    Конечная точка проверки работоспособности.
    """
    return {"status": "online", "api_version": "0.1.0", "environment": settings.APP_ENV}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
