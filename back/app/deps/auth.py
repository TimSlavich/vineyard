from typing import Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from loguru import logger
from tortoise.exceptions import DoesNotExist

from app.core.security import decode_token
from app.models.user import User, UserRole


# Схема безопасности для JWT-токена
security = HTTPBearer(auto_error=False)

# Общие исключения для повторного использования
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Невозможно проверить учетные данные",
    headers={"WWW-Authenticate": "Bearer"},
)

INACTIVE_USER_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Пользователь неактивен",
    headers={"WWW-Authenticate": "Bearer"},
)

INSUFFICIENT_PERMISSIONS_EXCEPTION = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Недостаточно прав доступа",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> User:
    """
    Получение текущего аутентифицированного пользователя.

    Args:
        credentials: HTTP Bearer токен

    Returns:
        User: Модель аутентифицированного пользователя

    Raises:
        HTTPException: Если аутентификация не удалась
    """
    if credentials is None:
        raise CREDENTIALS_EXCEPTION

    try:
        # Декодирование токена
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None:
            raise CREDENTIALS_EXCEPTION

        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный тип токена. Используйте токен доступа.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Получение пользователя из базы данных
        user = await User.get(id=user_id)

        if not user.is_active:
            raise INACTIVE_USER_EXCEPTION

        return user

    except JWTError:
        logger.debug("Ошибка проверки JWT")
        raise CREDENTIALS_EXCEPTION
    except DoesNotExist:
        logger.debug(f"Пользователь с указанным ID не найден")
        raise CREDENTIALS_EXCEPTION


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[User]:
    """
    Получение текущего пользователя, если аутентифицирован, иначе возвращает None.

    Args:
        credentials: Опциональный HTTP Bearer токен

    Returns:
        Optional[User]: Модель аутентифицированного пользователя или None
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Проверка наличия у текущего пользователя прав администратора.

    Args:
        current_user: Аутентифицированный пользователь

    Returns:
        User: Аутентифицированный пользователь-администратор

    Raises:
        HTTPException: Если у пользователя нет роли администратора
    """
    if current_user.role != UserRole.ADMIN:
        raise INSUFFICIENT_PERMISSIONS_EXCEPTION

    return current_user


async def get_manager_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Проверка наличия у текущего пользователя прав менеджера или администратора.

    Args:
        current_user: Аутентифицированный пользователь

    Returns:
        User: Аутентифицированный пользователь-менеджер/администратор

    Raises:
        HTTPException: Если у пользователя недостаточно прав
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа",
        )

    return current_user


async def validate_token(token: str) -> dict:
    """
    Проверка токена и возврат его содержимого.

    Args:
        token: JWT-токен

    Returns:
        dict: Содержимое токена

    Raises:
        HTTPException: Если проверка токена не удалась
    """
    try:
        return decode_token(token)
    except JWTError as e:
        logger.error(f"Ошибка проверки токена: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен",
        )
