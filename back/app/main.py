import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.logging import setup_logging
from app.core.middlewares import setup_middlewares
from app.routes import api_router
from app.websockets.routes import router as websocket_router


# Set up logging
setup_logging()

# Create FastAPI application
app = FastAPI(
    title="VineGuard API",
    description="API for Vineyard Management System",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Set up middleware
setup_middlewares(app)

# Include routers
app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)


@app.on_event("startup")
async def startup_event():
    """
    Run startup tasks.
    """
    logger.info("Starting up application...")

    # Initialize database connection
    await init_db()

    logger.info("Application startup complete.")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Run shutdown tasks.
    """
    logger.info("Shutting down application...")

    # Close database connection
    await close_db()

    logger.info("Application shutdown complete.")


@app.get("/", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "online", "api_version": "0.1.0", "environment": settings.APP_ENV}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
