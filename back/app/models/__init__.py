"""
Модели баз данных с использованием Tortoise ORM.
"""

# Импортируем модели для автозагрузки
from app.models.sensor import Sensor
from app.models.sensor_data import SensorData, SensorType
from app.models.device_settings import Device, DeviceStatus, DeviceMode
from app.models.device import DeviceActivity
from app.models.fertilizer_application import FertilizerApplication
from app.models.user import User
