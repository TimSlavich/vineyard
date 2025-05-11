from fastapi import HTTPException, status
from typing import  Optional
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from loguru import logger

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password

# Constants
SECRET_KEY = "your-256-bit-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# Token generation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


class UserBase(BaseModel):
    username: str
    email: str


class UserCreate(UserBase):
    password: str
    password_confirm: str


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime


async def create_user(user_data: UserCreate) -> User:
    """
    Create a new user.

    Args:
        user_data: User creation data

    Returns:
        Created user object

    Raises:
        HTTPException: If user creation fails
    """
    try:
        # Check if username or email already exists
        existing_username = await User.exists(username=user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        existing_email = await User.exists(email=user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )

        # Check if password and confirm_password match
        if user_data.password != user_data.password_confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match",
            )

        # Create the user
        user_dict = user_data.dict(exclude={"password_confirm"})
        user_dict["password"] = hash_password(user_data.password)  # Hash the password

        user = await User.create(**user_dict)
        logger.info(f"User created: {user.username}")

        return user

    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )


async def get_user_by_id(user_id: int) -> Optional[User]:
    """
    Получение пользователя по ID.

    Args:
        user_id: ID пользователя

    Returns:
        Пользователь или None, если не найден
    """
    return await User.get_or_none(id=user_id)


async def get_user_by_username(username: str) -> Optional[User]:
    """
    Получение пользователя по имени пользователя.

    Args:
        username: Имя пользователя

    Returns:
        Пользователь или None, если не найден
    """
    return await User.get_or_none(username=username)


async def get_user_by_email(email: str) -> Optional[User]:
    """
    Получение пользователя по email.

    Args:
        email: Email пользователя

    Returns:
        Пользователь или None, если не найден
    """
    return await User.get_or_none(email=email)


async def update_user_profile(user: User, user_data: UserUpdate) -> User:
    """
    Обновление профиля пользователя.

    Args:
        user: Пользователь для обновления
        user_data: Данные для обновления

    Returns:
        Обновленный пользователь

    Raises:
        HTTPException: Если обновление не удалось
    """
    try:
        # Обновление полей пользователя
        update_data = user_data.dict(exclude_unset=True)

        # Если были изменены email или username, проверяем конфликты
        if "email" in update_data and update_data["email"] != user.email:
            existing = await User.filter(email=update_data["email"]).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email уже используется другим пользователем",
                )

        if "username" in update_data and update_data["username"] != user.username:
            existing = await User.filter(username=update_data["username"]).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Имя пользователя уже используется",
                )

        # Применяем обновления
        await user.update_from_dict(update_data).save()
        logger.info(f"Профиль пользователя обновлен: {user.username}")

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении профиля пользователя: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обновить профиль пользователя",
        )


async def change_user_password(
    user: User, current_password: str, new_password: str
) -> bool:
    """
    Изменение пароля пользователя.

    Args:
        user: Пользователь
        current_password: Текущий пароль
        new_password: Новый пароль

    Returns:
        True если пароль успешно изменен

    Raises:
        HTTPException: Если изменение пароля не удалось
    """
    try:
        # Проверка текущего пароля
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный текущий пароль",
            )

        # Хеширование и сохранение нового пароля
        hashed_password = hash_password(new_password)
        await user.update_from_dict({"hashed_password": hashed_password}).save()

        logger.info(f"Пароль изменен для пользователя: {user.username}")
        return True

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при изменении пароля: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось изменить пароль",
        )
