# VineGuard API

Бэкенд для системы управления виноградником на FastAPI.

## Технологии

- **FastAPI** - асинхронный веб-фреймворк
- **Tortoise ORM** - асинхронный ORM для работы с БД
- **Pydantic** - валидация данных
- **JWT** - авторизация и аутентификация
- **WebSocket** - обновления в реальном времени
- **SQLite** - локальная база данных для разработки

## Основные возможности

- Авторизация и управление пользователями 
- Мониторинг данных с датчиков
- Управление системами полива и удобрения
- Сбор и анализ параметров окружающей среды
- Оповещения при критических показателях
- Реализация CRUD операций для всех сущностей

## Установка и запуск

### Используя Poetry (рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/vineguard.git
cd vineguard/back

# Установка зависимостей через Poetry
poetry install

# Активация виртуального окружения
poetry shell

# Запуск миграций
aerich upgrade

# Запуск приложения
uvicorn app.main:app --reload
```

### Используя Pip

```bash
# Создание виртуального окружения
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Запуск миграций
aerich upgrade

# Запуск сервера
uvicorn app.main:app --reload
```

## Структура проекта

```
app/
├── core/          # Настройки приложения, БД, безопасность
├── models/        # ORM модели 
├── schemas/       # Pydantic схемы
├── routes/        # API эндпоинты
├── services/      # Бизнес-логика
├── deps/          # Зависимости для маршрутов
├── websockets/    # WebSocket обработчики
├── utils/         # Вспомогательные функции
└── main.py        # Точка входа
```

## API документация

После запуска сервера документация доступна по адресам:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Переменные окружения

Создайте файл `.env` в корне проекта:

```
# База данных (SQLite по умолчанию)
DB_URL=sqlite://db.sqlite3

# JWT настройки
JWT_SECRET_KEY=your_secret_key_change_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Настройки приложения
APP_ENV=development
DEBUG=True
```

## Тестирование

```bash
pytest
pytest --cov=app  # с отчетом о покрытии
```

## Миграции

```bash
# Создание миграции
aerich migrate --name "описание_миграции"

# Применение миграций
aerich upgrade
``` 