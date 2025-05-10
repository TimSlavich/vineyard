from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, Body
from loguru import logger

from app.deps.auth import get_current_user, get_manager_user
from app.deps.pagination import PaginationParams, paginate
from app.models.user import User
from app.models.sensor_data import SensorData, SensorType
from app.models.fertilizer_application import FertilizerApplication
from app.models.device_settings import Device
from app.utils.date import get_date_range, format_datetime
from app.schemas.common import PaginatedResponse, StatusMessage


# Define report types
class ReportType(str, Enum):
    SENSOR_DATA = "sensor_data"
    FERTILIZER_APPLICATIONS = "fertilizer_applications"
    DEVICE_ACTIVITY = "device_activity"
    SYSTEM_ACTIVITY = "system_activity"
    CUSTOM = "custom"


# Create reports router
router = APIRouter()


@router.get("", response_model=List[Dict[str, Any]])
async def get_reports(
    report_type: Optional[ReportType] = Query(
        None, description="Filter by report type"
    ),
    current_user: User = Depends(get_current_user),
):
    """
    Get available reports.
    """
    # In a real application, these would be stored in a database
    # For now, we return hardcoded available reports
    all_reports = [
        {
            "id": 1,
            "name": "Sensor Data Summary",
            "type": ReportType.SENSOR_DATA,
            "description": "Summary of sensor data for a specific date range",
            "parameters": ["start_date", "end_date", "sensor_type", "location_id"],
        },
        {
            "id": 2,
            "name": "Fertilizer Applications",
            "type": ReportType.FERTILIZER_APPLICATIONS,
            "description": "Summary of fertilizer applications for a specific date range",
            "parameters": ["start_date", "end_date", "fertilizer_type", "location_id"],
        },
        {
            "id": 3,
            "name": "Device Activity",
            "type": ReportType.DEVICE_ACTIVITY,
            "description": "Activity log for devices",
            "parameters": ["start_date", "end_date", "device_type", "device_id"],
        },
        {
            "id": 4,
            "name": "System Activity",
            "type": ReportType.SYSTEM_ACTIVITY,
            "description": "System activity log including user actions",
            "parameters": ["start_date", "end_date", "user_id", "action_type"],
        },
        {
            "id": 5,
            "name": "Custom Report",
            "type": ReportType.CUSTOM,
            "description": "Custom report with user-defined parameters",
            "parameters": ["start_date", "end_date", "query"],
        },
    ]

    # Filter by report type if provided
    if report_type:
        return [report for report in all_reports if report["type"] == report_type]

    return all_reports


@router.post("/generate", response_model=Dict[str, Any])
async def generate_report(
    report_type: ReportType,
    parameters: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a report based on type and parameters.
    """
    # Validate parameters
    if "start_date" in parameters:
        try:
            parameters["start_date"] = datetime.fromisoformat(parameters["start_date"])
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS).",
            )

    if "end_date" in parameters:
        try:
            parameters["end_date"] = datetime.fromisoformat(parameters["end_date"])
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS).",
            )

    # Set default date range if not provided
    if "start_date" not in parameters and "end_date" not in parameters:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        parameters["start_date"] = start_date
        parameters["end_date"] = end_date

    # Generate report based on type
    if report_type == ReportType.SENSOR_DATA:
        return await generate_sensor_data_report(parameters, current_user)
    elif report_type == ReportType.FERTILIZER_APPLICATIONS:
        return await generate_fertilizer_report(parameters, current_user)
    elif report_type == ReportType.DEVICE_ACTIVITY:
        return await generate_device_activity_report(parameters, current_user)
    elif report_type == ReportType.SYSTEM_ACTIVITY:
        return await generate_system_activity_report(parameters, current_user)
    elif report_type == ReportType.CUSTOM:
        return await generate_custom_report(parameters, current_user)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported report type: {report_type}",
        )


async def generate_sensor_data_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """
    Generate a sensor data report.
    """
    # Extract parameters
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    sensor_type = parameters.get("sensor_type")
    location_id = parameters.get("location_id")

    # Build query
    query = SensorData.all()

    if start_date:
        query = query.filter(timestamp__gte=start_date)

    if end_date:
        query = query.filter(timestamp__lte=end_date)

    if sensor_type:
        query = query.filter(type=sensor_type)

    if location_id:
        query = query.filter(location_id=location_id)

    # Get data
    data = await query.order_by("timestamp")

    # Prepare results by sensor type
    results_by_type = {}
    async for record in data:
        sensor_type = record.type.value
        if sensor_type not in results_by_type:
            results_by_type[sensor_type] = []

        results_by_type[sensor_type].append(
            {
                "timestamp": record.timestamp.isoformat(),
                "value": record.value,
                "unit": record.unit,
                "sensor_id": record.sensor_id,
                "location_id": record.location_id,
                "status": record.status,
            }
        )

    # Calculate statistics for each sensor type
    statistics = {}
    for sensor_type, records in results_by_type.items():
        if records:
            values = [record["value"] for record in records]
            statistics[sensor_type] = {
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "count": len(values),
                "unit": records[0]["unit"],
            }

    # Prepare report
    report = {
        "type": ReportType.SENSOR_DATA,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "sensor_type": sensor_type,
            "location_id": location_id,
        },
        "summary": {
            "total_records": sum(len(records) for records in results_by_type.values()),
            "sensor_types": list(results_by_type.keys()),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "statistics": statistics,
        "data": results_by_type,
    }

    return report


async def generate_fertilizer_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """
    Generate a fertilizer applications report.
    """
    # Extract parameters
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    fertilizer_type = parameters.get("fertilizer_type")
    location_id = parameters.get("location_id")

    # Build query
    query = FertilizerApplication.all()

    if start_date:
        query = query.filter(application_date__gte=start_date)

    if end_date:
        query = query.filter(application_date__lte=end_date)

    if fertilizer_type:
        query = query.filter(fertilizer_type=fertilizer_type)

    if location_id:
        query = query.filter(location_id=location_id)

    # Get data
    data = await query.order_by("application_date")

    # Prepare results
    applications = []
    total_amount = 0
    fertilizer_types = set()

    for app in data:
        fertilizer_types.add(app.fertilizer_type.value)
        total_amount += app.amount

        applications.append(
            {
                "id": app.id,
                "name": app.name,
                "fertilizer_type": app.fertilizer_type.value,
                "application_date": app.application_date.isoformat(),
                "application_method": app.application_method.value,
                "amount": app.amount,
                "unit": app.unit,
                "location_id": app.location_id,
                "status": app.status.value,
                "created_by_id": app.created_by_id,
            }
        )

    # Prepare report
    report = {
        "type": ReportType.FERTILIZER_APPLICATIONS,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "fertilizer_type": fertilizer_type,
            "location_id": location_id,
        },
        "summary": {
            "total_applications": len(applications),
            "total_amount": total_amount,
            "fertilizer_types": list(fertilizer_types),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "data": applications,
    }

    return report


async def generate_device_activity_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """
    Generate a device activity report.

    This is a placeholder implementation.
    """
    # Extract parameters
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    device_type = parameters.get("device_type")
    device_id = parameters.get("device_id")

    # In a real application, we would query device activity logs here
    # For now, we return a placeholder report with sample data

    return {
        "type": ReportType.DEVICE_ACTIVITY,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "device_type": device_type,
            "device_id": device_id,
        },
        "summary": {
            "total_activities": 0,
            "devices": [],
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "data": [],
        "note": "This is a placeholder implementation. In a real application, device activity logs would be queried from the database.",
    }


async def generate_system_activity_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """
    Generate a system activity report.

    This is a placeholder implementation.
    """
    # Extract parameters
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    user_id = parameters.get("user_id")
    action_type = parameters.get("action_type")

    # In a real application, we would query system activity logs here
    # For now, we return a placeholder report with sample data

    return {
        "type": ReportType.SYSTEM_ACTIVITY,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "user_id": user_id,
            "action_type": action_type,
        },
        "summary": {
            "total_activities": 0,
            "users": [],
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "data": [],
        "note": "This is a placeholder implementation. In a real application, system activity logs would be queried from the database.",
    }


async def generate_custom_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """
    Generate a custom report.

    This is a placeholder implementation.
    """
    # Extract parameters
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    query = parameters.get("query")

    # In a real application, we would process the custom query here
    # For now, we return a placeholder report

    return {
        "type": ReportType.CUSTOM,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "query": query,
        },
        "summary": {
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "data": [],
        "note": "This is a placeholder implementation. In a real application, custom reports would be processed based on the provided query.",
    }
