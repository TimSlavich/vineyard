from typing import Optional

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from loguru import logger
from tortoise.exceptions import DoesNotExist

from app.core.security import decode_token
from app.models.user import User, UserRole


# Security scheme for JWT token
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> User:
    """
    Get the current authenticated user.

    Args:
        credentials: HTTP Bearer token

    Returns:
        User: The authenticated user model

    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode token
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None:
            raise credentials_exception

        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type. Use an access token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError as e:
        logger.error(f"JWT validation error: {e}")
        raise credentials_exception

    try:
        # Get user from database
        user = await User.get(id=user_id)

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user

    except DoesNotExist:
        logger.error(f"User with ID {user_id} not found")
        raise credentials_exception


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(
        security, use_cache=False
    ),
) -> Optional[User]:
    """
    Get the current user if authenticated, otherwise return None.

    Args:
        credentials: Optional HTTP Bearer token

    Returns:
        Optional[User]: The authenticated user model or None
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
    Check if the current user has admin privileges.

    Args:
        current_user: The authenticated user

    Returns:
        User: The authenticated admin user

    Raises:
        HTTPException: If user doesn't have admin role
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return current_user


async def get_manager_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Check if the current user has manager or admin privileges.

    Args:
        current_user: The authenticated user

    Returns:
        User: The authenticated manager/admin user

    Raises:
        HTTPException: If user doesn't have sufficient role
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return current_user


async def validate_token(token: str) -> dict:
    """
    Validate a token and return its payload.

    Args:
        token: JWT token

    Returns:
        dict: Token payload

    Raises:
        HTTPException: If token validation fails
    """
    try:
        return decode_token(token)
    except JWTError as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
