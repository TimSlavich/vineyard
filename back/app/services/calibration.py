import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from loguru import logger

from app.models.sensor_data import SensorData, SensorType


class CalibrationStatus:
    """Статус калибровки датчика"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class CalibrationResult:
    """Результаты калибровки датчика"""

    def __init__(
        self,
        sensor_id: str,
        status: str = CalibrationStatus.PENDING,
        progress: int = 0,
        message: str = "",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        adjustment_value: Optional[float] = None,
    ):
        self.sensor_id = sensor_id
        self.status = status
        self.progress = progress
        self.message = message
        self.start_time = start_time or datetime.now()
        self.end_time = end_time
        self.adjustment_value = adjustment_value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sensor_id": self.sensor_id,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "adjustment_value": self.adjustment_value,
        }


# Словарь для отслеживания процессов калибровки
# Ключ: sensor_id, значение: CalibrationResult
active_calibrations: Dict[str, CalibrationResult] = {}


async def start_sensor_calibration(
    sensor_id: str, user_id: int, sensor_type: SensorType = None
) -> Dict[str, Any]:
    """Запуск процесса калибровки датчика"""

    # Проверяем, не запущена ли уже калибровка для этого датчика
    if sensor_id in active_calibrations:
        current_calibration = active_calibrations[sensor_id]
        if current_calibration.status == CalibrationStatus.IN_PROGRESS:
            logger.warning(f"Калибровка для датчика {sensor_id} уже запущена")
            return current_calibration.to_dict()

    # Если тип датчика не передан, пытаемся определить его из БД
    if not sensor_type:
        sensor_data = await SensorData.filter(sensor_id=sensor_id).first()
        if sensor_data:
            sensor_type = sensor_data.type

    # Инициализируем процесс калибровки
    calibration = CalibrationResult(
        sensor_id=sensor_id,
        status=CalibrationStatus.IN_PROGRESS,
        progress=0,
        message="Початок калібрування...",
    )
    active_calibrations[sensor_id] = calibration

    # Запускаем асинхронную задачу для выполнения калибровки
    asyncio.create_task(perform_calibration(sensor_id, user_id, sensor_type))

    return calibration.to_dict()


async def perform_calibration(
    sensor_id: str, user_id: int, sensor_type: Optional[SensorType] = None
) -> None:
    """Выполнение процесса калибровки датчика"""
    try:
        calibration = active_calibrations[sensor_id]

        # Имитация этапов калибровки
        steps = [
            "Перевірка з'єднання з датчиком...",
            "Зчитування поточних значень...",
            "Аналіз відхилень...",
            "Обчислення корегувальних коефіцієнтів...",
            "Застосування налаштувань...",
            "Тестування калібрування...",
            "Завершення і збереження налаштувань...",
        ]

        for i, step in enumerate(steps):
            # Обновляем прогресс и сообщение
            progress = int((i / len(steps)) * 100)
            calibration.progress = progress
            calibration.message = step

            # Имитация длительности этапа
            await asyncio.sleep(
                0.5
            )  # В реальной системе здесь будет реальный код для калибровки

        # Генерируем случайное значение корректировки для демонстрации
        adjustment = round(0.2 + 0.8 * (hash(sensor_id) % 10) / 10, 2)  # От 0.2 до 1.0

        # Завершаем калибровку успешно
        calibration.status = CalibrationStatus.COMPLETED
        calibration.progress = 100
        calibration.message = "Калібрування успішно завершено"
        calibration.end_time = datetime.now()
        calibration.adjustment_value = adjustment

    except Exception as e:
        logger.error(f"Ошибка при калибровке датчика {sensor_id}: {str(e)}")

        # Обновляем статус на ошибку
        if sensor_id in active_calibrations:
            calibration = active_calibrations[sensor_id]
            calibration.status = CalibrationStatus.FAILED
            calibration.message = f"Помилка калібрування: {str(e)}"
            calibration.end_time = datetime.now()


async def get_calibration_status(sensor_id: str) -> Dict[str, Any]:
    """Получение текущего статуса калибровки датчика"""
    if sensor_id in active_calibrations:
        return active_calibrations[sensor_id].to_dict()

    # Если калибровка не найдена, возвращаем информацию, что нет активной калибровки
    return {
        "sensor_id": sensor_id,
        "status": "not_found",
        "message": "Немає активного процесу калібрування для цього датчика",
        "progress": 0,
    }


async def get_all_calibrations(user_id: int) -> List[Dict[str, Any]]:
    """Получение списка всех калибровок (активных и завершенных) для пользователя"""
    # В реальной системе здесь должна быть выборка из БД
    # Возвращаем только активные калибровки из оперативной памяти
    return [calibration.to_dict() for calibration in active_calibrations.values()]


async def reset_calibration(sensor_id: str) -> Dict[str, Any]:
    """Сброс калибровки датчика"""
    if sensor_id in active_calibrations:
        if active_calibrations[sensor_id].status == CalibrationStatus.IN_PROGRESS:
            # Нельзя сбросить активную калибровку
            return {
                "success": False,
                "message": "Неможливо скинути калібрування під час процесу",
            }

        # Удаляем информацию о калибровке
        del active_calibrations[sensor_id]

    return {"success": True, "message": "Калібрування скинуто"}
