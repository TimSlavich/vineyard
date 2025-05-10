"""
API routes for the application.
"""

from fastapi import APIRouter

from app.routes import auth, sensors, fertilizer, reports, settings, devices

# Create main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
api_router.include_router(fertilizer.router, prefix="/fertilizer", tags=["Fertilizers"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(devices.router, prefix="/devices", tags=["Devices"])
