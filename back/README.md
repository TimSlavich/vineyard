# VineGuard Backend API

Модульный и высокопроизводительный backend для системы управления виноградником, построенный на современном стеке Python.

## 🧰 Технологический стек

- **FastAPI** - Асинхронный web-фреймворк с автоматической генерацией документации
- **PostgreSQL** - Основная база данных
- **Tortoise ORM** - Асинхронный ORM для работы с базой данных
- **Pydantic** - Строгая валидация и сериализация данных
- **JWT** - Безопасная аутентификация с поддержкой access и refresh токенов
- **WebSocket** - Поддержка обновлений в реальном времени
- **Docker** - Контейнеризация приложения и зависимостей

## 📋 Функциональные возможности

- **Аутентификация и авторизация**
  - Регистрация и авторизация пользователей
  - JWT-токены с обновлением
  - Разграничение прав доступа (администратор, менеджер, пользователь)

- **Мониторинг сенсоров**
  - Получение и хранение данных от различных типов сенсоров
  - Уведомления при выходе показателей за пороговые значения
  - Поддержка различных единиц измерения

- **Управление удобрениями**
  - Планирование внесения удобрений
  - Отслеживание применения удобрений
  - Создание расписаний автоматизации

- **Работа с устройствами**
  - Регистрация различных типов устройств
  - Управление режимами работы
  - Журналирование активности

- **Отчеты**
  - Генерация различных типов отчетов
  - Экспорт данных
  - Анализ исторических данных

- **WebSocket для обновлений в реальном времени**
  - Оперативное обновление данных с сенсоров
  - Оповещения о событиях
  - Поддержка группового вещания

## 🗂️ Структура проекта

```
app/
├── core/               # Ядро приложения
│   ├── config.py       # Конфигурация приложения
│   ├── database.py     # Настройка базы данных
│   ├── security.py     # JWT и хеширование
│   ├── logging.py      # Настройка логирования
│   └── middlewares.py  # Промежуточное ПО
├── models/             # Модели данных (Tortoise ORM)
├── schemas/            # Pydantic схемы для валидации
├── routes/             # API маршруты
├── services/           # Бизнес-логика
├── deps/               # Зависимости для маршрутов
├── websockets/         # WebSocket обработчики
├── utils/              # Вспомогательные функции
└── main.py             # Точка входа
```

## 🚀 Запуск проекта

### С использованием Docker

```bash
# Запуск с Docker Compose
docker-compose up -d

# Проверка логов
docker-compose logs -f
```

### Локальная разработка

```bash
# Создание виртуального окружения
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Запуск миграций базы данных
aerich upgrade

# Запуск сервера
uvicorn app.main:app --reload
```

## 📚 API документация

После запуска приложения, документация API доступна по следующим URL:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- OpenAPI JSON: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

## 🔒 Переменные окружения

Скопируйте `.env.example` в `.env` и настройте переменные окружения:

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=vineguard_db

# JWT
JWT_SECRET_KEY=your_super_secret_key_change_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App settings
APP_ENV=development
DEBUG=True
```

## 🧪 Тестирование

```bash
# Запуск всех тестов
pytest

# Запуск с отчетом о покрытии
pytest --cov=app
```

## 🔄 WebSocket API

WebSocket соединения доступны по следующим URL:

- Основной WebSocket: `/ws`
- Данные с сенсоров: `/ws/sensor-data`
- События устройств: `/ws/device-events`
- События внесения удобрений: `/ws/fertilizer-events`

## 📦 База данных и миграции

```bash
# Инициализация миграций
aerich init -t app.core.database.TORTOISE_ORM

# Создание миграции
aerich migrate --name "migration_name"

# Применение миграций
aerich upgrade
``` 