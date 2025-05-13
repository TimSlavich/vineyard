from fastapi import APIRouter, Body, Depends, HTTPException, status
from loguru import logger

from app.deps.auth import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserAuthenticate,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    UserUpdate,
    PasswordChange,
)
from app.schemas.common import StatusMessage
from app.services.auth import (
    authenticate_user,
    create_user,
    create_user_tokens,
    refresh_access_token,
    revoke_refresh_token,
    verify_password,
    hash_password,
)
from app.services.sensor_simulator import (
    get_or_create_user_sensors,
    generate_and_save_sensor_data,
)

# Создание маршрутизатора аутентификации
router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""
    # Создаем пользователя
    user = await create_user(user_data)

    # Создаем датчики для пользователя
    logger.debug(f"Создание датчиков для пользователя: {user.id}")
    await get_or_create_user_sensors(user.id)

    # Генерируем начальные данные для датчиков (исторические данные)
    logger.debug(f"Генерация начальных данных датчиков для пользователя: {user.id}")
    # Генерируем 10 последовательных наборов данных для создания истории
    for _ in range(10):
        await generate_and_save_sensor_data(user.id)

    return user


@router.post("/login", response_model=TokenResponse)
async def login(auth_data: UserAuthenticate):
    """Аутентификация пользователя и выдача токенов"""
    user = await authenticate_user(auth_data)
    access_token, refresh_token, _ = await create_user_tokens(user)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_data: TokenRefresh):
    """Обновление токена доступа"""
    return await refresh_access_token(refresh_data.refresh_token)


@router.post("/logout", response_model=StatusMessage)
async def logout(
    refresh_token: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Выход из системы"""
    revoked = await revoke_refresh_token(refresh_token)

    if revoked:
        logger.debug(f"Пользователь {current_user.username} вышел из системы")
        return {"status": "success", "message": "Вихід із системи виконано успішно"}
    else:
        logger.debug(f"Некорректная попытка выхода для {current_user.username}")
        return {"status": "warning", "message": "Токен уже закінчився або недійсний"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
):
    """Обновление профиля пользователя"""
    try:
        # Обновляем только предоставленные поля
        update_data = user_data.dict(exclude_unset=True)
        if not update_data:
            return current_user

        # Обновляем пользователя
        await current_user.update_from_dict(update_data).save()
        updated_user = await User.get(id=current_user.id)

        logger.debug(f"Пользователь {current_user.username} обновил профиль")
        return updated_user
    except Exception as e:
        logger.error(f"Ошибка обновления пользователя: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка обновления профиля пользователя",
        )


@router.put("/me/password", response_model=StatusMessage)
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
):
    """Изменение пароля пользователя"""
    try:
        # Проверяем текущий пароль
        if not verify_password(
            password_data.current_password, current_user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Текущий пароль неверен",
            )

        # Проверяем совпадение нового пароля и подтверждения
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Новый пароль и подтверждение не совпадают",
            )

        # Обновляем пароль
        hashed_password = hash_password(password_data.new_password)
        await current_user.update_from_dict({"hashed_password": hashed_password}).save()

        logger.debug(f"Пароль изменен для пользователя {current_user.username}")
        return {"status": "success", "message": "Пароль успішно змінено"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при изменении пароля: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при изменении пароля",
        )


@router.delete("/me", response_model=StatusMessage)
async def delete_account(current_user: User = Depends(get_current_user)):
    """Удаление учетной записи пользователя"""
    try:
        # Сохраняем данные для логирования
        user_id = current_user.id
        username = current_user.username

        # Удаляем пользователя
        await current_user.delete()

        return {"status": "success", "message": "Обліковий запис успішно видалено"}
    except Exception as e:
        logger.error(f"Ошибка при удалении учетной записи пользователя: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при удалении учетной записи",
        )
