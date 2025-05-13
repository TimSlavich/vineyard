from datetime import datetime, timedelta
from typing import Tuple, Dict, Any

from fastapi import HTTPException, status
from loguru import logger
from tortoise.exceptions import DoesNotExist, IntegrityError


from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.models.user import User, RefreshToken, UserRole
from app.schemas.user import UserCreate, UserAuthenticate
from app.core.config import settings


async def authenticate_user(auth_data: UserAuthenticate) -> User:
    """
    Аутентификация пользователя по имени и паролю.

    Args:
        auth_data: Данные аутентификации с именем пользователя и паролем

    Returns:
        User: Аутентифицированный пользователь

    Raises:
        HTTPException: Если аутентификация не удалась
    """
    try:
        # Попытка найти пользователя по имени
        user = await User.get(username=auth_data.username)

        # Проверка активности пользователя
        if not user.is_active:
            logger.warning(
                f"Попытка входа неактивного пользователя: {auth_data.username}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Аккаунт отключен",
            )

        # Проверка пароля
        if not verify_password(auth_data.password, user.hashed_password):
            logger.warning(
                f"Неудачная попытка входа пользователя: {auth_data.username}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
            )

        return user

    except DoesNotExist:
        # Пользователь не найден
        logger.warning(
            f"Попытка входа несуществующего пользователя: {auth_data.username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
        )


async def create_user(user_data: UserCreate) -> User:
    """
    Создание нового пользователя.

    Args:
        user_data: Данные для создания пользователя

    Returns:
        User: Созданный пользователь

    Raises:
        HTTPException: Если создание пользователя не удалось
    """
    # Проверка совпадения паролей
    if user_data.password != user_data.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароли не совпадают",
        )

    try:
        # Определение роли и количества датчиков
        role = user_data.role or UserRole.NEW_USER
        is_admin = role == UserRole.ADMIN

        # Определение количества датчиков в зависимости от роли
        sensor_count = (
            user_data.sensor_count if hasattr(user_data, "sensor_count") else None
        )
        if sensor_count is None:
            if role == UserRole.ADMIN:
                sensor_count = 20  # Админам даем максимальное количество датчиков
            elif role == UserRole.DEMO:
                sensor_count = 10  # Демо-пользователям даем среднее количество
            else:
                sensor_count = 0  # Новым пользователям даем базовое количество

        # Создание пользователя с хешированным паролем
        user = await User.create(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=role,
            is_active=user_data.is_active,
            sensor_count=sensor_count,
            is_admin=is_admin,
        )

        return user

    except IntegrityError as e:
        # Обработка ошибок уникальности (email или username)
        error_message = str(e).lower()
        if "unique" in error_message:
            if "email" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким email уже существует",
                )
            elif "username" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким именем уже существует",
                )

        # Другие ошибки целостности данных
        logger.error(f"Ошибка создания пользователя (целостность данных): {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ошибка создания пользователя из-за проблем с данными",
        )
    except Exception as e:
        # Общая обработка ошибок
        logger.error(f"Неизвестная ошибка создания пользователя: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания пользователя",
        )


async def create_user_tokens(user: User) -> Tuple[str, str, datetime]:
    """
    Создание токенов доступа и обновления для пользователя.

    Args:
        user: Пользователь, для которого создаются токены

    Returns:
        Кортеж, содержащий:
            - токен доступа
            - токен обновления
            - время истечения токена обновления
    """
    # Создание токена доступа
    access_token = create_access_token(subject=user.id)

    # Создание токена обновления
    refresh_token_str = create_refresh_token(subject=user.id)

    # Расчет времени истечения токена обновления (по умолчанию 7 дней)
    expires_at = datetime.utcnow() + timedelta(days=7)

    # Сохранение токена обновления в базе данных
    await RefreshToken.create(
        user=user,
        token=refresh_token_str,
        expires_at=expires_at,
    )

    logger.debug(f"Созданы токены для пользователя: {user.username}")

    return access_token, refresh_token_str, expires_at


async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Обновление токена доступа с помощью токена обновления.

    Args:
        refresh_token: Токен обновления

    Returns:
        Словарь с новыми токенами доступа и обновления

    Raises:
        HTTPException: Если обновление токена не удалось
    """
    try:
        # Декодирование JWT для проверки валидности
        payload = verify_token(refresh_token, "refresh")
        if not payload:
            logger.warning("Недействительный или просроченный токен обновления")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный или просроченный токен",
            )

        user_id = payload.get("sub")
        if not user_id:
            logger.warning("Отсутствует ID пользователя в токене обновления")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный токен",
            )

        # Поиск токена в БД
        try:
            token_obj = await RefreshToken.get(
                token=refresh_token,
                is_revoked=False,
                expires_at__gt=datetime.utcnow(),
            ).prefetch_related("user")
            user = token_obj.user
        except DoesNotExist:
            # Проверка существования пользователя если токен не найден
            try:
                user = await User.get(id=user_id)
                if not user.is_active:
                    logger.warning(
                        f"Попытка обновления для неактивного пользователя: {user_id}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Пользователь неактивен",
                    )
            except DoesNotExist:
                logger.warning(f"Пользователь не найден для токена. ID: {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Пользователь не найден",
                )

            logger.warning(
                f"Валидный JWT, но токен не найден в БД. Создаем новый. ID: {user_id}"
            )
            token_obj = None

        # Создание новых токенов
        access_token = create_access_token(subject=user.id)
        refresh_token_str = create_refresh_token(subject=user.id)
        expires_at = datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        # Отзыв старого токена
        if token_obj:
            await token_obj.update_from_dict({"is_revoked": True}).save()

        # Создание новой записи токена в БД
        try:
            await RefreshToken.create(
                user=user,
                token=refresh_token_str,
                expires_at=expires_at,
            )
        except IntegrityError:
            # Обработка дубликата токена
            logger.warning("Обнаружен дубликат токена обновления, генерируем новый")
            refresh_token_str = create_refresh_token(subject=user.id)
            await RefreshToken.create(
                user=user,
                token=refresh_token_str,
                expires_at=expires_at,
            )

        # Очистка старых токенов
        await cleanup_old_tokens(user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка в refresh_access_token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Произошла внутренняя ошибка сервера при обновлении токена",
        )


async def cleanup_old_tokens(user_id: int) -> None:
    """
    Очищает старые токены пользователя.
    Оставляет только 5 последних активных токенов.

    Args:
        user_id: ID пользователя
    """
    try:
        # Поиск не отозванных токенов пользователя
        tokens = (
            await RefreshToken.filter(
                user_id=user_id, is_revoked=False, expires_at__gt=datetime.utcnow()
            )
            .order_by("-created_at")
            .all()
        )

        # Отзыв старых токенов если их больше 5
        if len(tokens) > 5:
            for token in tokens[5:]:
                await token.update_from_dict({"is_revoked": True}).save()
                logger.debug(f"Отозван старый токен для пользователя {user_id}")

        # Удаление просроченных токенов
        await RefreshToken.filter(expires_at__lt=datetime.utcnow()).delete()
    except Exception as e:
        logger.error(f"Ошибка при очистке старых токенов: {e}")


async def revoke_refresh_token(token: str) -> bool:
    """
    Отзыв токена обновления.

    Args:
        token: Токен обновления для отзыва

    Returns:
        bool: True если токен был отозван, False в противном случае
    """
    try:
        token_obj = await RefreshToken.get(token=token)

        if not token_obj.is_revoked:
            await token_obj.update_from_dict({"is_revoked": True}).save()
            return True

        return False

    except DoesNotExist:
        logger.warning(f"Попытка отозвать несуществующий токен: {token[:10]}...")
        return False
