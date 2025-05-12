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
from app.models.user import User, UserRole
from app.core.security import hash_password, verify_password


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


async def create_demo_user_if_not_exists():
    """
    Создает демо-пользователя, если он еще не существует.
    """
    try:
        demo_user = await User.get_or_none(username="demo_user")

        if not demo_user:
            logger.info("Создание демо-пользователя...")

            # Хешируем пароль "demo"
            hashed_password = hash_password("demo")

            # Создаем демо-пользователя
            demo_user = await User.create(
                username="demo_user",
                email="demo@example.com",
                hashed_password=hashed_password,
                first_name="Demo",
                last_name="User",
                is_active=True,
                role=UserRole.DEMO,
                sensor_count=10,
                is_admin=False,
            )

            logger.info(f"Демо-пользователь успешно создан с ID: {demo_user.id}")
        else:
            logger.info(f"Демо-пользователь уже существует с ID: {demo_user.id}")

            # Обновляем настройки демо-пользователя
            needs_update = False

            if demo_user.role != UserRole.DEMO or demo_user.sensor_count != 10:
                demo_user.role = UserRole.DEMO
                demo_user.sensor_count = 10
                needs_update = True

            # Проверяем возможность входа с паролем "demo"
            # Если пароль не совпадает (из-за смены алгоритма хеширования), обновляем его
            if not verify_password("demo", demo_user.hashed_password):
                logger.info(
                    "Обновление пароля демо-пользователя из-за изменения алгоритма хеширования"
                )
                demo_user.hashed_password = hash_password("demo")
                needs_update = True

            if needs_update:
                await demo_user.save()
                logger.info("Настройки демо-пользователя обновлены")

    except Exception as e:
        logger.error(f"Ошибка при создании демо-пользователя: {e}")


async def create_admin_user_if_not_exists():
    """
    Создает пользователя-администратора, если он еще не существует.
    """
    try:
        admin_user = await User.get_or_none(username="s_love.ich")

        if not admin_user:
            logger.info("Создание пользователя-администратора...")

            # Хешируем пароль
            hashed_password = hash_password("Timatimtim2003")

            # Создаем пользователя-администратора
            admin_user = await User.create(
                username="s_love.ich",
                email="koktim44@gmail.com",
                hashed_password=hashed_password,
                first_name="Timofii",
                last_name="Slavych",
                is_active=True,
                role=UserRole.ADMIN,
                sensor_count=20,
                is_admin=True,
            )

            logger.info(
                f"Пользователь-администратор успешно создан с ID: {admin_user.id}"
            )
        else:
            logger.info(
                f"Пользователь-администратор уже существует с ID: {admin_user.id}"
            )

            # Обновляем настройки админа
            needs_update = False

            if (
                admin_user.role != UserRole.ADMIN
                or not admin_user.is_admin
                or admin_user.sensor_count != 20
            ):
                admin_user.role = UserRole.ADMIN
                admin_user.is_admin = True
                admin_user.sensor_count = 20
                needs_update = True

            if needs_update:
                await admin_user.save()
                logger.info("Настройки пользователя-администратора обновлены")

    except Exception as e:
        logger.error(f"Ошибка при создании пользователя-администратора: {e}")


@app.on_event("startup")
async def startup_event():
    """
    Выполнение задач при запуске приложения.
    """
    logger.info("Запуск приложения...")

    # Инициализация подключения к базе данных
    await init_db()

    # Создание демо-пользователя
    await create_demo_user_if_not_exists()

    # Создание пользователя-администратора
    await create_admin_user_if_not_exists()

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
