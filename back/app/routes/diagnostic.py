from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body

from app.deps.auth import get_current_user
from app.models.user import User
from app.services.diagnostic import (
    run_system_diagnostics,
    get_diagnostic_recommendations,
)

router = APIRouter()


@router.get("/run", response_model=List[Dict[str, Any]])
async def run_diagnostics(current_user: User = Depends(get_current_user)):
    """Запуск полной диагностики системы"""
    try:
        results = await run_system_diagnostics(current_user.id)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при виконанні діагностики: {str(e)}",
        )


@router.post("/recommendations", response_model=List[str])
async def get_recommendations(
    results: List[Dict[str, Any]] = Body(None),
    current_user: User = Depends(get_current_user),
):
    """
    Получение рекомендаций на основе результатов диагностики.
    Если результаты не переданы, запускается новая диагностика.
    """
    try:
        if not results:
            results = await run_system_diagnostics(current_user.id)

        recommendations = await get_diagnostic_recommendations(results)
        return recommendations
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Помилка при отриманні рекомендацій: {str(e)}",
        )
