from typing import List, Union

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Настройки приложения.
    """

    # Настройки приложения
    APP_ENV: str = "development"
    APP_PORT: int = 8080
    APP_HOST: str = "0.0.0.0"
    DEBUG: bool = True

    # Настройки JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Подключение к базе данных - SQLite
    DB_PATH: str = "db.sqlite3"

    # Настройки CORS
    CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = []

    # Логирование
    LOG_LEVEL: str = "DEBUG"

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        """
        Преобразование строки CORS origins в список.
        """
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


# Создание экземпляра настроек для импорта
settings = Settings()
