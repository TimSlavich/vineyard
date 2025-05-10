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
)
from app.schemas.common import StatusMessage
from app.services.auth import (
    authenticate_user,
    create_user,
    create_user_tokens,
    refresh_access_token,
    revoke_refresh_token,
)

# Create auth router
router = APIRouter()


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(user_data: UserCreate):
    """
    Register a new user.
    """
    user = await create_user(user_data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(auth_data: UserAuthenticate):
    """
    Authenticate a user and return access and refresh tokens.
    """
    # Authenticate user
    user = await authenticate_user(auth_data)

    # Create tokens
    access_token, refresh_token, _ = await create_user_tokens(user)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_data: TokenRefresh):
    """
    Refresh access token using a refresh token.
    """
    tokens = await refresh_access_token(refresh_data.refresh_token)
    return tokens


@router.post("/logout", response_model=StatusMessage)
async def logout(
    refresh_token: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """
    Logout user by revoking refresh token.
    """
    revoked = await revoke_refresh_token(refresh_token)

    if revoked:
        logger.info(f"User {current_user.username} logged out successfully")
        return {"status": "success", "message": "Logged out successfully"}
    else:
        logger.warning(f"Failed logout attempt for user {current_user.username}")
        return {"status": "warning", "message": "Token already expired or invalid"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get information about the current authenticated user.
    """
    return current_user
