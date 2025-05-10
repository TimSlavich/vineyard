from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


def setup_middlewares(app: FastAPI) -> None:
    """
    Setup middlewares for the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Setup CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Setup logging middleware
    app.add_middleware(LoggingMiddleware)

    # Add other middlewares here


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging requests and responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process a request and log its details.

        Args:
            request: The incoming request
            call_next: Function to call the next middleware/route handler

        Returns:
            The response from the next middleware/route handler
        """
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}")

        # Process request and get response
        try:
            response = await call_next(request)

            # Log response
            logger.info(
                f"Response: {request.method} {request.url.path} - Status: {response.status_code}"
            )

            return response
        except Exception as e:
            # Log error
            logger.error(
                f"Error processing request: {request.method} {request.url.path} - Error: {str(e)}"
            )
            raise
