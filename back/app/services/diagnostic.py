import asyncio
from typing import Dict, List, Any
from datetime import datetime

from loguru import logger

from app.models.sensor_data import SensorData, SensorType


class DiagnosticResult:
    """Результат диагностики компонента системы"""

    def __init__(self, component: str, status: str, message: str):
        self.component = component
        self.status = status
        self.message = message
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "component": self.component,
            "status": self.status,
            "message": self.message,
            "timestamp": self.timestamp,
        }


async def run_system_diagnostics(user_id: int) -> List[Dict[str, Any]]:
    """Запуск полной диагностики системы"""
    results = []

    # Проверка базы данных
    db_result = await check_database()
    results.append(db_result.to_dict())

    # Проверка датчиков
    sensors_result = await check_sensors(user_id)
    results.extend([r.to_dict() for r in sensors_result])

    # Проверка системы оповещений
    notification_result = await check_notifications(user_id)
    results.append(notification_result.to_dict())

    # Проверка резервного копирования
    backup_result = await check_backup_system()
    results.append(backup_result.to_dict())

    return results


async def check_database() -> DiagnosticResult:
    """Проверка соединения с базой данных"""
    try:
        # Имитация проверки соединения с БД
        await asyncio.sleep(1)
        return DiagnosticResult(
            component="Сервер бази даних",
            status="success",
            message="З'єднання стабільне, затримка 42мс",
        )
    except Exception as e:
        logger.error(f"Ошибка при проверке БД: {str(e)}")
        return DiagnosticResult(
            component="Сервер бази даних",
            status="error",
            message=f"Проблема з підключенням: {str(e)}",
        )


async def check_sensors(user_id: int) -> List[DiagnosticResult]:
    """Проверка статуса датчиков пользователя"""
    results = []

    try:
        # Получаем последние данные с датчиков температуры
        temp_sensors = (
            await SensorData.filter(user_id=user_id, type=SensorType.TEMPERATURE)
            .order_by("-timestamp")
            .limit(10)
        )

        if temp_sensors:
            results.append(
                DiagnosticResult(
                    component="Датчики температури",
                    status="success",
                    message="Всі пристрої в мережі",
                )
            )
        else:
            results.append(
                DiagnosticResult(
                    component="Датчики температури",
                    status="warning",
                    message="Немає актуальних даних з датчиків температури",
                )
            )

        # Получаем последние данные с датчиков влажности
        moisture_sensors = (
            await SensorData.filter(user_id=user_id, type=SensorType.SOIL_MOISTURE)
            .order_by("-timestamp")
            .limit(10)
        )

        # Имитируем необходимость калибровки одного из датчиков
        if moisture_sensors:
            results.append(
                DiagnosticResult(
                    component="Датчики вологості",
                    status="warning",
                    message="Датчик №247 потребує калібрування",
                )
            )
        else:
            results.append(
                DiagnosticResult(
                    component="Датчики вологості",
                    status="warning",
                    message="Немає актуальних даних з датчиків вологості",
                )
            )

        # Проверка системы мониторинга
        results.append(
            DiagnosticResult(
                component="Система моніторингу",
                status="success",
                message="Працює нормально",
            )
        )

    except Exception as e:
        logger.error(f"Ошибка при проверке датчиков: {str(e)}")
        results.append(
            DiagnosticResult(
                component="Датчики",
                status="error",
                message=f"Помилка при діагностиці датчиків: {str(e)}",
            )
        )

    return results


async def check_notifications(user_id: int) -> DiagnosticResult:
    """Проверка системы оповещений"""
    try:
        # Имитация проверки системы оповещений
        await asyncio.sleep(0.5)
        return DiagnosticResult(
            component="Система оповіщень",
            status="success",
            message="Налаштована правильно",
        )
    except Exception as e:
        logger.error(f"Ошибка при проверке системы оповещений: {str(e)}")
        return DiagnosticResult(
            component="Система оповіщень",
            status="error",
            message=f"Помилка системи оповіщень: {str(e)}",
        )


async def check_backup_system() -> DiagnosticResult:
    """Проверка системы резервного копирования"""
    try:
        # Имитация проверки резервного копирования
        # В реальной системе здесь стоит проверить дату последнего бэкапа
        await asyncio.sleep(0.5)
        return DiagnosticResult(
            component="Резервне копіювання",
            status="error",
            message="Остання резервна копія створена більше 7 днів тому",
        )
    except Exception as e:
        logger.error(f"Ошибка при проверке системы резервного копирования: {str(e)}")
        return DiagnosticResult(
            component="Резервне копіювання",
            status="error",
            message=f"Помилка системи резервного копіювання: {str(e)}",
        )


async def get_diagnostic_recommendations(results: List[Dict[str, Any]]) -> List[str]:
    """Формирование рекомендаций на основе результатов диагностики"""
    recommendations = []

    for result in results:
        if result["status"] == "warning":
            if "Датчик №247" in result["message"]:
                recommendations.append("Виконати калібрування датчика вологості №247")
            elif "датчиків" in result["message"]:
                recommendations.append("Перевірити підключення датчиків та їх стан")
        elif result["status"] == "error":
            if "Резервне копіювання" in result["component"]:
                recommendations.append(
                    "Налаштувати автоматичне резервне копіювання даних"
                )
            else:
                recommendations.append(f"Усунути проблему: {result['message']}")

    return recommendations
