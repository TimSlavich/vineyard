from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from jose import JWTError, jwt
from loguru import logger
from passlib.context import CryptContext

from app.core.config import settings

# Контекст хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Создание JWT-токена доступа.

    Args:
        subject: Субъект токена (обычно ID пользователя)
        expires_delta: Опциональное время истечения срока действия

    Returns:
        Строка JWT-токена
    """
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Создание JWT-токена обновления.

    Args:
        subject: Субъект токена (обычно ID пользователя)
        expires_delta: Опциональное время истечения срока действия

    Returns:
        Строка JWT-токена
    """
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )

    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Dict[str, Any]:
    """
    Декодирование JWT-токена.

    Args:
        token: JWT-токен

    Returns:
        Декодированная полезная нагрузка токена

    Raises:
        JWTError: Если токен недействителен
    """
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as e:
        logger.error(f"Ошибка декодирования JWT: {str(e)}")
        raise


def verify_token(token: str, expected_type: str = None) -> Optional[Dict[str, Any]]:
    """
    Проверка JWT-токена и опционально его типа.

    Args:
        token: JWT-токен для проверки
        expected_type: Опциональный ожидаемый тип токена ('access' или 'refresh')

    Returns:
        Декодированная полезная нагрузка токена, если действителен, иначе None
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # Проверка типа токена, если указан expected_type
        if expected_type and payload.get("type") != expected_type:
            logger.debug(
                f"Несоответствие типа токена: ожидался={expected_type}, получен={payload.get('type')}"
            )
            return None

        return payload
    except JWTError:
        # Уменьшаем уровень лога, т.к. это нормальное поведение для многих запросов
        logger.debug(f"Недействительный токен")
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверка пароля по хешу.

    Args:
        plain_password: Открытый пароль
        hashed_password: Хешированный пароль

    Returns:
        True, если пароль совпадает, иначе False
    """
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """
    Хеширование пароля.

    Args:
        password: Открытый пароль

    Returns:
        Хешированный пароль
    """
    return pwd_context.hash(password)
