from datetime import datetime, timedelta
import statistics
import json
from typing import List, Dict, Any, Optional
from loguru import logger

from app.models.sensor_data import SensorData
from app.models.fertilizer_application import FertilizerApplication
from app.models.device import Device, DeviceActivity
from app.models.user import User


class ReportService:
    """Сервис для генерации отчетов на основе данных системы"""

    @staticmethod
    async def generate_sensor_report(
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        sensor_type: Optional[str] = None,
        location_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Генерирует отчет на основе данных датчиков

        Args:
            user_id: ID пользователя
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            sensor_type: Тип датчика для фильтрации
            location_id: ID локации для фильтрации

        Returns:
            Словарь с данными отчета
        """
        # Устанавливаем период по умолчанию, если не указан
        if not end_date:
            end_date = datetime.utcnow()

        if not start_date:
            start_date = end_date - timedelta(days=7)

        # Получаем данные датчиков из базы
        query = SensorData.filter(user_id=user_id)

        # Применяем фильтры
        if start_date:
            query = query.filter(timestamp__gte=start_date)

        if end_date:
            query = query.filter(timestamp__lte=end_date)

        if sensor_type:
            # Получаем список ID датчиков нужного типа
            sensors = await SensorData.filter(type=sensor_type, user_id=user_id)
            sensor_ids = [s.sensor_id for s in sensors]
            if sensor_ids:
                query = query.filter(sensor_id__in=sensor_ids)
            else:
                # Если нет датчиков указанного типа, возвращаем пустой отчет
                return ReportService._build_empty_sensor_report(
                    user_id, start_date, end_date, sensor_type, location_id
                )

        if location_id:
            # Получаем список ID датчиков в указанной локации
            sensors = await SensorData.filter(location_id=location_id, user_id=user_id)
            sensor_ids = [s.sensor_id for s in sensors]
            if sensor_ids:
                query = query.filter(sensor_id__in=sensor_ids)
            else:
                # Если нет датчиков в указанной локации, возвращаем пустой отчет
                return ReportService._build_empty_sensor_report(
                    user_id, start_date, end_date, sensor_type, location_id
                )

        # Получаем данные с пагинацией
        sensor_data = await query.order_by("-timestamp").limit(1000)

        # Если нет данных, возвращаем пустой отчет
        if not sensor_data:
            return ReportService._build_empty_sensor_report(
                user_id, start_date, end_date, sensor_type, location_id
            )

        # Группируем данные по типам датчиков
        data_by_type: Dict[str, List[Dict[str, Any]]] = {}

        for data in sensor_data:
            # Добавляем данные в соответствующую группу
            if data.type not in data_by_type:
                data_by_type[data.type] = []

            data_by_type[data.type].append(
                {
                    "timestamp": data.timestamp.isoformat(),
                    "value": data.value,
                    "unit": data.unit,
                    "sensor_id": data.sensor_id,
                    "location_id": data.location_id,
                    "status": "normal" if data.status == "normal" else "alert",
                }
            )

        # Рассчитываем статистику для каждого типа датчиков
        statistics_by_type: Dict[str, Dict[str, Any]] = {}

        for sensor_type, records in data_by_type.items():
            values = [record["value"] for record in records]

            statistics_by_type[sensor_type] = {
                "min": min(values) if values else 0,
                "max": max(values) if values else 0,
                "avg": sum(values) / len(values) if values else 0,
                "median": statistics.median(values) if values else 0,
                "count": len(values),
                "unit": records[0]["unit"] if records else "",
            }

        # Формируем отчет
        user = await User.get(id=user_id)

        return {
            "type": "sensor_data",
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": user.username if user else "unknown",
            "parameters": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "sensor_type": sensor_type,
                "location_id": location_id,
            },
            "summary": {
                "total_records": sum(len(records) for records in data_by_type.values()),
                "sensor_types": list(data_by_type.keys()),
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None,
                },
            },
            "statistics": statistics_by_type,
            "data": data_by_type,
        }

    @staticmethod
    def _build_empty_sensor_report(
        user_id: int,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        sensor_type: Optional[str],
        location_id: Optional[str],
    ) -> Dict[str, Any]:
        """Создает пустой шаблон отчета о данных датчиков"""
        return {
            "type": "sensor_data",
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": "system",
            "parameters": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "sensor_type": sensor_type,
                "location_id": location_id,
            },
            "summary": {
                "total_records": 0,
                "sensor_types": [],
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None,
                },
            },
            "statistics": {},
            "data": {},
        }

    @staticmethod
    async def generate_fertilizer_report(
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        fertilizer_type: Optional[str] = None,
        location_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Генерирует отчет о внесении удобрений

        Args:
            user_id: ID пользователя
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            fertilizer_type: Тип удобрения для фильтрации
            location_id: ID локации для фильтрации

        Returns:
            Словарь с данными отчета
        """
        # Устанавливаем период по умолчанию, если не указан
        if not end_date:
            end_date = datetime.utcnow()

        if not start_date:
            start_date = end_date - timedelta(days=30)  # За последний месяц

        # Получаем данные о внесении удобрений
        query = FertilizerApplication.filter(user_id=user_id)

        # Применяем фильтры
        if start_date:
            query = query.filter(application_date__gte=start_date)

        if end_date:
            query = query.filter(application_date__lte=end_date)

        if fertilizer_type:
            query = query.filter(fertilizer_type=fertilizer_type)

        if location_id:
            query = query.filter(location_id=location_id)

        # Получаем данные
        applications = await query.order_by("-application_date")

        # Преобразуем данные в формат для отчета
        data = []
        fertilizer_types = set()
        total_amount = 0

        for app in applications:
            fertilizer_types.add(app.fertilizer_type)
            total_amount += app.amount

            data.append(
                {
                    "id": app.id,
                    "name": app.name,
                    "fertilizer_type": app.fertilizer_type,
                    "application_date": app.application_date.isoformat(),
                    "application_method": app.application_method,
                    "amount": app.amount,
                    "unit": app.unit,
                    "location_id": app.location_id,
                    "status": app.status,
                    "created_by_id": app.user_id,
                }
            )

        # Получаем пользователя
        user = await User.get(id=user_id)

        # Формируем отчет
        return {
            "type": "fertilizer_applications",
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": user.username if user else "unknown",
            "parameters": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "fertilizer_type": fertilizer_type,
                "location_id": location_id,
            },
            "summary": {
                "total_applications": len(data),
                "total_amount": total_amount,
                "fertilizer_types": list(fertilizer_types),
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None,
                },
            },
            "data": data,
        }

    @staticmethod
    async def generate_device_report(
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        device_type: Optional[str] = None,
        device_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Генерирует отчет об активности устройств

        Args:
            user_id: ID пользователя
            start_date: Начальная дата периода
            end_date: Конечная дата периода
            device_type: Тип устройства для фильтрации
            device_id: ID устройства для фильтрации

        Returns:
            Словарь с данными отчета
        """
        # Устанавливаем период по умолчанию, если не указан
        if not end_date:
            end_date = datetime.utcnow()

        if not start_date:
            start_date = end_date - timedelta(days=7)

        # Получаем данные об активности устройств
        query = DeviceActivity.filter(user_id=user_id)

        # Применяем фильтры
        if start_date:
            query = query.filter(timestamp__gte=start_date)

        if end_date:
            query = query.filter(timestamp__lte=end_date)

        if device_id:
            device = await Device.get_or_none(device_id=device_id, user_id=user_id)
            if device:
                query = query.filter(device_id=device.id)

        if device_type:
            # Получаем список ID устройств нужного типа
            devices = await Device.filter(type=device_type, user_id=user_id)
            device_ids = [d.id for d in devices]
            if device_ids:
                query = query.filter(device_id__in=device_ids)

        # Получаем данные
        activities = await query.order_by("-timestamp").limit(1000)

        # Преобразуем данные
        data = []
        device_ids = set()
        device_types = set()

        for activity in activities:
            # Получаем устройство
            device = await Device.get_or_none(id=activity.device_id)
            if not device:
                continue

            device_ids.add(device.device_id)
            device_types.add(device.type)

            # Преобразуем детали в словарь, если они в JSON
            details = {}
            if activity.details:
                try:
                    if isinstance(activity.details, str):
                        details = json.loads(activity.details)
                    else:
                        details = activity.details
                except Exception as e:
                    logger.error(f"Error parsing activity details: {e}")

            data.append(
                {
                    "id": activity.id,
                    "device_id": device.device_id,
                    "device_type": device.type,
                    "activity_type": activity.activity_type,
                    "timestamp": activity.timestamp.isoformat(),
                    "status": activity.status,
                    "details": details,
                }
            )

        # Получаем пользователя
        user = await User.get(id=user_id)

        # Формируем отчет
        return {
            "type": "device_activity",
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": user.username if user else "unknown",
            "parameters": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
                "device_type": device_type,
                "device_id": device_id,
            },
            "summary": {
                "total_activities": len(data),
                "devices": list(device_ids),
                "device_types": list(device_types),
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None,
                },
            },
            "data": data,
        }
