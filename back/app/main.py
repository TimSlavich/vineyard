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


# Налаштування логування
setup_logging()

# Створення FastAPI додатка
app = FastAPI(
    title="VineGuard API",
    description="API для системи управління виноградниками",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Примусово налаштовуємо CORS для розробки
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Используем настройки из конфига
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Налаштування проміжного ПЗ
setup_middlewares(app)

# Підключення маршрутизаторів
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)

# Змінна для зберігання завдання симулятора
sensor_simulator_task = None


async def create_demo_user_if_not_exists():
    """
    Создает демо-пользователя, если он еще не существует.
    """
    try:
        demo_user = await User.get_or_none(email="demo@example.com")

        if not demo_user:
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
        else:
            # Обновляем настройки демо-пользователя
            needs_update = False

            if demo_user.role != UserRole.DEMO or demo_user.sensor_count != 10:
                demo_user.role = UserRole.DEMO
                demo_user.sensor_count = 10
                needs_update = True

            # Проверяем возможность входа с паролем "demo"
            # Если пароль не совпадает (из-за смены алгоритма хеширования), обновляем его
            if not verify_password("demo", demo_user.hashed_password):
                demo_user.hashed_password = hash_password("demo")
                needs_update = True

            if needs_update:
                await demo_user.save()
    except Exception as e:
        logger.error(f"Ошибка при создании демо-пользователя: {e}")


async def create_admin_user_if_not_exists():
    """
    Создает пользователя-администратора, если он еще не существует.
    """
    try:
        admin_user = await User.get_or_none(email="koktim44@gmail.com")

        if not admin_user:
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
        else:
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
    except Exception as e:
        logger.error(f"Ошибка при создании пользователя-администратора: {e}")


@app.on_event("startup")
async def startup_event():
    """
    Виконання завдань при запуску додатка.
    """
    # Ініціалізація підключення до бази даних
    await init_db()

    # Створення демо-користувача
    await create_demo_user_if_not_exists()

    # Створення користувача-адміністратора
    await create_admin_user_if_not_exists()

    # Запуск симулятора датчиков як фонову задачу
    global sensor_simulator_task
    sensor_simulator_task = await start_sensor_simulator()


@app.on_event("shutdown")
async def shutdown_event():
    """
    Виконання завдань при зупинці додатка.
    """
    # Остановка симулятора датчиков
    global sensor_simulator_task
    if sensor_simulator_task:
        sensor_simulator_task.cancel()
        try:
            await sensor_simulator_task
        except asyncio.CancelledError:
            logger.debug("Симулятор датчиков успішно зупинено.")

    # Закриття підключення до бази даних
    await close_db()

    logger.debug("Зупинка додатка завершена.")


@app.get("/", tags=["Health"])
async def health_check():
    """
    Кінцева точка перевірки роботоздатності.
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
