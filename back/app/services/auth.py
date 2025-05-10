from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any

from fastapi import HTTPException, status
from loguru import logger
from tortoise.exceptions import DoesNotExist, IntegrityError

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from app.models.user import User, RefreshToken, UserRole
from app.schemas.user import UserCreate, UserAuthenticate


async def authenticate_user(auth_data: UserAuthenticate) -> User:
    """
    Authenticate a user by username and password.

    Args:
        auth_data: Authentication data containing username and password

    Returns:
        User: Authenticated user

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Try to find the user by username
        user = await User.get(username=auth_data.username)

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {auth_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled",
            )

        # Verify password
        if not verify_password(auth_data.password, user.hashed_password):
            logger.warning(f"Failed login attempt for user: {auth_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )

        return user

    except DoesNotExist:
        # User not found
        logger.warning(f"Login attempt for non-existent user: {auth_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )


async def create_user(user_data: UserCreate) -> User:
    """
    Create a new user.

    Args:
        user_data: User creation data

    Returns:
        User: Created user

    Raises:
        HTTPException: If user creation fails
    """
    # Check if passwords match
    if user_data.password != user_data.password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    try:
        # Create user with hashed password
        user = await User.create(
            email=user_data.email,
            username=user_data.username,
            hashed_password=get_password_hash(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role or UserRole.VIEWER,
            is_active=user_data.is_active,
        )

        logger.info(f"Created new user: {user.username} ({user.email})")
        return user

    except IntegrityError as e:
        # Handle unique constraint violation
        logger.error(f"Failed to create user: {e}")

        if "username" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )
        elif "email" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User creation failed",
            )


async def create_user_tokens(user: User) -> Tuple[str, str, datetime]:
    """
    Create access and refresh tokens for a user.

    Args:
        user: The user to create tokens for

    Returns:
        Tuple containing:
            - access token
            - refresh token
            - refresh token expiry datetime
    """
    # Create access token
    access_token = create_access_token(subject=user.id)

    # Create refresh token
    refresh_token_str = create_refresh_token(subject=user.id)

    # Calculate expiry time for refresh token (7 days by default)
    expires_at = datetime.utcnow() + timedelta(days=7)

    # Store refresh token in database
    await RefreshToken.create(
        user=user,
        token=refresh_token_str,
        expires_at=expires_at,
    )

    logger.debug(f"Created tokens for user: {user.username}")

    return access_token, refresh_token_str, expires_at


async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Refresh an access token using a refresh token.

    Args:
        refresh_token: The refresh token

    Returns:
        Dict with new access and refresh tokens

    Raises:
        HTTPException: If token refresh fails
    """
    try:
        # Get the refresh token from database
        token_obj = await RefreshToken.get(
            token=refresh_token,
            is_revoked=False,
            expires_at__gt=datetime.utcnow(),
        ).prefetch_related("user")

        # Get the associated user
        user = token_obj.user

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Token refresh attempt for inactive user: {user.username}")
            await token_obj.update_from_dict({"is_revoked": True}).save()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is inactive",
            )

        # Revoke the old refresh token
        await token_obj.update_from_dict({"is_revoked": True}).save()

        # Create new tokens
        access_token, new_refresh_token, expires_at = await create_user_tokens(user)

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }

    except DoesNotExist:
        logger.warning(f"Invalid refresh token attempt: {refresh_token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )


async def revoke_refresh_token(token: str) -> bool:
    """
    Revoke a refresh token.

    Args:
        token: The refresh token to revoke

    Returns:
        bool: True if token was revoked, False otherwise
    """
    try:
        token_obj = await RefreshToken.get(token=token)

        if not token_obj.is_revoked:
            await token_obj.update_from_dict({"is_revoked": True}).save()
            logger.info(f"Revoked refresh token for user ID: {token_obj.user_id}")
            return True

        return False

    except DoesNotExist:
        logger.warning(f"Attempt to revoke non-existent token: {token[:10]}...")
        return False
