"""
Утилиты для форматирования значений
"""

from app.schemas.sensor import SensorType


def format_sensor_value(value: float, sensor_type: SensorType = None) -> str:
    """
    Форматирует значение датчика в зависимости от его типа

    Args:
        value: Числовое значение датчика
        sensor_type: Тип датчика

    Returns:
        Отформатированная строка с значением
    """
    # Для температуры и pH используем один десятичный знак
    if sensor_type in [
        SensorType.TEMPERATURE,
        SensorType.SOIL_TEMPERATURE,
        SensorType.PH,
    ]:
        return f"{round(value, 1)}"

    # Для процентных значений округляем до целого числа
    if sensor_type in [SensorType.HUMIDITY, SensorType.SOIL_MOISTURE, SensorType.LIGHT]:
        return f"{round(value)}"

    # По умолчанию округляем до одного десятичного знака
    return f"{round(value, 1)}"
