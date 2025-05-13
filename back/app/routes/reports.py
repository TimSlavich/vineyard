from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import io
import csv
import xlsxwriter
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER
from loguru import logger
from fastapi import APIRouter, Depends, Query, HTTPException, status, Body, Response
from fastapi.responses import JSONResponse
import os
import re

from app.deps.auth import get_current_user
from app.models.user import User


# Типы отчетов
class ReportType(str, Enum):
    SENSOR_DATA = "sensor_data"
    FERTILIZER_APPLICATIONS = "fertilizer_applications"
    DEVICE_ACTIVITY = "device_activity"
    SYSTEM_ACTIVITY = "system_activity"
    CUSTOM = "custom"


# Форматы отчетов
class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "xlsx"
    CSV = "csv"
    JSON = "json"


# Create reports router
router = APIRouter()

# Базовая директория для хранения отчетов
REPORTS_BASE_DIR = "reports"

# Создаем базовую директорию при импорте модуля
if not os.path.exists(REPORTS_BASE_DIR):
    os.makedirs(REPORTS_BASE_DIR)

# Хранилище отчетов (в реальном приложении использовалась бы база данных)
_generated_reports = {}


# Вспомогательные функции для генерации отчетов
def convert_to_csv(content: Dict[str, Any]) -> str:
    """Конвертирует данные отчета в CSV формат"""
    try:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")

        # Заголовок отчета
        writer.writerow(["Звіт", "Дата формування"])
        writer.writerow([content.get("type", ""), content.get("generated_at", "")])
        writer.writerow([])

        # Параметры отчета
        writer.writerow(["Параметри звіту"])
        if "parameters" in content:
            for key, value in content["parameters"].items():
                writer.writerow([key, value])
        writer.writerow([])

        # Данные
        if "data" in content:
            # Для данных датчиков
            if isinstance(content["data"], dict):
                for sensor_type, records in content["data"].items():
                    writer.writerow([f"Тип датчика: {sensor_type}"])
                    if records and isinstance(records, list) and records:
                        # Заголовки
                        headers = list(records[0].keys())
                        writer.writerow(headers)

                        # Данные
                        for record in records:
                            row_data = []
                            for h in headers:
                                value = record.get(h, "")
                                # Форматируем даты
                                if isinstance(value, str) and (
                                    "T" in value
                                    or "+" in value
                                    or value.count("-") >= 2
                                ):
                                    try:
                                        value = format_date(value)
                                    except:
                                        pass
                                row_data.append(str(value))
                            writer.writerow(row_data)
                        writer.writerow([])

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                # Заголовки
                headers = list(content["data"][0].keys())
                writer.writerow(headers)

                # Данные
                for record in content["data"]:
                    row_data = []
                    for h in headers:
                        value = record.get(h, "")
                        # Форматируем даты
                        if isinstance(value, str) and (
                            "T" in value or "+" in value or value.count("-") >= 2
                        ):
                            try:
                                value = format_date(value)
                            except:
                                pass
                        row_data.append(str(value))
                    writer.writerow(row_data)

        # Статистика
        if "statistics" in content:
            writer.writerow([])
            writer.writerow(["Статистика"])
            for sensor_type, stats in content["statistics"].items():
                writer.writerow([f"Тип датчика: {sensor_type}"])
                for key, value in stats.items():
                    writer.writerow([key, value])
                writer.writerow([])

        return output.getvalue()
    except Exception as e:
        logger.error(f"Помилка при створенні CSV: {e}")
        return "Помилка при створенні звіту CSV"


def create_excel(content: Dict[str, Any]) -> bytes:
    """Создает Excel файл из данных отчета"""
    try:
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)

        # Стили
        title_format = workbook.add_format(
            {"bold": True, "font_size": 14, "align": "center"}
        )
        header_format = workbook.add_format(
            {"bold": True, "bg_color": "#D9E1F2", "border": 1}
        )
        cell_format = workbook.add_format({"border": 1})
        section_format = workbook.add_format(
            {"bold": True, "font_size": 12, "bg_color": "#E2EFDA"}
        )

        # Основной лист
        worksheet = workbook.add_worksheet("Звіт")
        worksheet.set_column(0, 0, 30)
        worksheet.set_column(1, 10, 20)

        # Заголовок
        row = 0
        worksheet.merge_range(
            row, 0, row, 5, f"Звіт: {content.get('type', '')}", title_format
        )
        row += 1
        worksheet.write(row, 0, "Дата формування:", header_format)
        worksheet.write(row, 1, content.get("generated_at", ""), cell_format)
        row += 2

        # Параметры
        if "parameters" in content:
            worksheet.merge_range(row, 0, row, 5, "Параметри звіту", section_format)
            row += 1
            for key, value in content["parameters"].items():
                worksheet.write(row, 0, key, header_format)
                worksheet.write(
                    row, 1, str(value) if value is not None else "", cell_format
                )
                row += 1
            row += 1

        # Данные
        if "data" in content:
            # Для данных датчиков
            if isinstance(content["data"], dict):
                for sensor_type, records in content["data"].items():
                    worksheet.merge_range(
                        row, 0, row, 5, f"Тип датчика: {sensor_type}", section_format
                    )
                    row += 1

                    if records and isinstance(records, list) and records:
                        # Заголовки
                        headers = list(records[0].keys())
                        for col, header in enumerate(headers):
                            worksheet.write(row, col, header, header_format)
                        row += 1

                        # Данные
                        for record in records:
                            for col, header in enumerate(headers):
                                value = record.get(header, "")
                                # Форматируем даты, если это похоже на ISO дату
                                if isinstance(value, str) and (
                                    "T" in value
                                    or "+" in value
                                    or value.count("-") >= 2
                                ):
                                    try:
                                        value = format_date(value)
                                    except:
                                        pass  # Если не удалось отформатировать, оставляем как есть
                                worksheet.write(row, col, value, cell_format)
                            row += 1
                        row += 1

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                worksheet.merge_range(row, 0, row, 5, "Дані", section_format)
                row += 1

                # Заголовки
                headers = list(content["data"][0].keys())
                for col, header in enumerate(headers):
                    worksheet.write(row, col, header, header_format)
                row += 1

                # Данные
                for record in content["data"]:
                    for col, header in enumerate(headers):
                        value = record.get(header, "")
                        # Форматируем даты, если это похоже на ISO дату
                        if isinstance(value, str) and (
                            "T" in value or "+" in value or value.count("-") >= 2
                        ):
                            try:
                                value = format_date(value)
                            except:
                                pass  # Если не удалось отформатировать, оставляем как есть
                        worksheet.write(row, col, value, cell_format)
                    row += 1
                row += 1

        # Статистика
        if "statistics" in content:
            worksheet.merge_range(row, 0, row, 5, "Статистика", section_format)
            row += 1
            for sensor_type, stats in content["statistics"].items():
                worksheet.write(row, 0, f"Тип датчика: {sensor_type}", header_format)
                row += 1
                for key, value in stats.items():
                    worksheet.write(row, 0, key, header_format)
                    worksheet.write(row, 1, value, cell_format)
                    row += 1
                row += 1

        workbook.close()
        return output.getvalue()

    except Exception as e:
        logger.error(f"Помилка при створенні Excel: {e}")
        # Возвращаем простой CSV в случае ошибки
        return convert_to_csv(content).encode("utf-8")


def create_pdf(content: Dict[str, Any]) -> bytes:
    """Создает PDF файл из данных отчета"""
    try:
        buffer = io.BytesIO()

        # Создаем документ
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30,
        )
        elements = []

        # Стили
        styles = getSampleStyleSheet()
        title_style = styles["Heading1"]
        heading2_style = styles["Heading2"]
        normal_style = styles["Normal"]

        # Убираем попытку регистрации кириллического шрифта и используем стандартные
        # Так как она вызывает проблемы с кодировкой на различных системах

        # Используем UTF-8 в метаданных
        title = f"Звіт: {content.get('type', '')}".encode("utf-8").decode("utf-8")
        generated_at = f"Дата формування: {content.get('generated_at', '')}".encode(
            "utf-8"
        ).decode("utf-8")
        generated_by = (
            f"Сформовано користувачем: {content.get('generated_by', '')}".encode(
                "utf-8"
            ).decode("utf-8")
        )

        # Заголовок отчета с безопасным текстом
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(generated_at, normal_style))
        elements.append(Paragraph(generated_by, normal_style))
        elements.append(Spacer(1, 20))

        # Параметры отчета
        if "parameters" in content:
            elements.append(Paragraph("Параметри звіту", heading2_style))
            data = []
            data.append(["Параметр", "Значення"])
            for key, value in content["parameters"].items():
                # Форматируем даты, если значение похоже на дату
                if (
                    value
                    and isinstance(value, str)
                    and ("T" in value or "+" in value or value.count("-") >= 2)
                ):
                    try:
                        value = format_date(value)
                    except:
                        pass
                data.append([key, str(value) if value is not None else ""])

            table = Table(data, colWidths=[200, 300])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ]
                )
            )
            elements.append(table)
            elements.append(Spacer(1, 20))

        # Статистика
        if "statistics" in content:
            elements.append(Paragraph("Статистика", heading2_style))
            for sensor_type, stats in content["statistics"].items():
                elements.append(Paragraph(f"Тип: {sensor_type}", heading2_style))

                data = []
                data.append(["Показник", "Значення"])
                for key, value in stats.items():
                    data.append([key, str(value)])

                table = Table(data, colWidths=[200, 300])
                table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ]
                    )
                )
                elements.append(table)
                elements.append(Spacer(1, 20))

        # Данные
        if "data" in content:
            elements.append(Paragraph("Дані", heading2_style))

            # Для данных датчиков
            if isinstance(content["data"], dict):
                for sensor_type, records in content["data"].items():
                    elements.append(Paragraph(f"Тип: {sensor_type}", heading2_style))

                    if records and isinstance(records, list) and records:
                        # Заголовки из первой записи
                        headers = list(records[0].keys())

                        # Формируем таблицу
                        data = [headers]  # Заголовок
                        for record in records[:50]:  # Ограничиваем количество строк
                            row = []
                            for h in headers:
                                value = record.get(h, "")
                                # Форматируем даты
                                if isinstance(value, str) and (
                                    "T" in value
                                    or "+" in value
                                    or value.count("-") >= 2
                                ):
                                    try:
                                        value = format_date(value)
                                    except:
                                        pass
                                row.append(str(value))
                            data.append(row)

                        # Настраиваем таблицу
                        col_widths = [min(120, 500 / len(headers)) for _ in headers]
                        table = Table(data, colWidths=col_widths)
                        table.setStyle(
                            TableStyle(
                                [
                                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                                ]
                            )
                        )
                        elements.append(table)

                        if len(records) > 50:
                            elements.append(
                                Paragraph(
                                    f"Показано перших 50 з {len(records)} записів",
                                    normal_style,
                                )
                            )

                        elements.append(Spacer(1, 20))

            # Создаем PDF
            doc.build(elements)
            return buffer.getvalue()

    except Exception as e:
        logger.error(f"Помилка при створенні PDF: {e}")
        # В случае ошибки возвращаем простой HTML
        return convert_to_html(content).encode("utf-8")


def convert_to_html(content: Dict[str, Any]) -> str:
    """Конвертирует данные отчета в HTML формат"""
    try:
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Звіт</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2, h3 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                table, th, td { border: 1px solid #ddd; }
                th, td { padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .section { margin-bottom: 30px; }
            </style>
        </head>
        <body>
        """

        # Заголовок отчета
        html += f"<h1>Звіт: {content.get('type', '')}</h1>"
        html += f"<p>Дата формування: {content.get('generated_at', '')}</p>"
        html += f"<p>Сформовано користувачем: {content.get('generated_by', '')}</p>"

        # Параметры отчета
        if "parameters" in content:
            html += "<div class='section'>"
            html += "<h2>Параметри звіту</h2>"
            html += "<table>"
            html += "<tr><th>Параметр</th><th>Значення</th></tr>"
            for key, value in content["parameters"].items():
                html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table>"
            html += "</div>"

        # Сводная информация
        if "summary" in content:
            html += "<div class='section'>"
            html += "<h2>Зведена інформація</h2>"
            html += "<table>"
            for key, value in content["summary"].items():
                if not isinstance(value, dict):
                    html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table>"
            html += "</div>"

        # Статистика
        if "statistics" in content:
            html += "<div class='section'>"
            html += "<h2>Статистика за типами датчиків</h2>"
            for sensor_type, stats in content["statistics"].items():
                html += f"<h3>Тип датчика: {sensor_type}</h3>"
                html += "<table>"
                html += "<tr><th>Показник</th><th>Значення</th></tr>"
                for key, value in stats.items():
                    html += f"<tr><td>{key}</td><td>{value}</td></tr>"
                html += "</table>"
            html += "</div>"

        # Данные
        if "data" in content:
            html += "<div class='section'>"
            html += "<h2>Дані</h2>"

            # Для данных датчиков
            if isinstance(content["data"], dict):
                for sensor_type, records in content["data"].items():
                    html += f"<h3>Тип датчика: {sensor_type}</h3>"
                    if records and isinstance(records, list) and records:
                        # Таблица с данными
                        html += "<table>"
                        # Заголовки
                        html += "<tr>"
                        for key in records[0].keys():
                            html += f"<th>{key}</th>"
                        html += "</tr>"

                        # Данные
                        for record in records:
                            html += "<tr>"
                            for key, value in record.items():
                                # Форматируем даты
                                if isinstance(value, str) and (
                                    "T" in value
                                    or "+" in value
                                    or value.count("-") >= 2
                                ):
                                    try:
                                        value = format_date(value)
                                    except:
                                        pass
                                html += f"<td>{value}</td>"
                            html += "</tr>"
                        html += "</table>"

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                # Таблица с данными
                html += "<table>"
                # Заголовки
                html += "<tr>"
                for key in content["data"][0].keys():
                    html += f"<th>{key}</th>"
                html += "</tr>"

                # Данные
                for record in content["data"]:
                    html += "<tr>"
                    for key, value in record.items():
                        # Форматируем даты
                        if isinstance(value, str) and (
                            "T" in value or "+" in value or value.count("-") >= 2
                        ):
                            try:
                                value = format_date(value)
                            except:
                                pass
                        html += f"<td>{value}</td>"
                    html += "</tr>"
                html += "</table>"

            html += "</div>"

        html += """
        </body>
        </html>
        """

        return html
    except Exception as e:
        logger.error(f"Помилка при створенні HTML: {e}")
        return "<html><body><h1>Помилка при формуванні HTML звіту</h1></body></html>"


def format_date(date_str: str) -> str:
    """Форматирует строку даты в более читабельный формат"""
    if not date_str:
        return ""

    # Проверяем, не является ли строка уже форматированной
    if re.match(r"\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}", date_str):
        return date_str

    try:
        # Для дат в ISO формате с временной зоной
        if "T" in date_str or "+" in date_str or "Z" in date_str:
            # Очищаем строку от часового пояса
            clean_date_str = date_str.split("+")[0] if "+" in date_str else date_str
            clean_date_str = clean_date_str.replace("Z", "")

            # Убираем миллисекунды
            if "." in clean_date_str:
                clean_date_str = clean_date_str.split(".")[0]

            try:
                date_obj = datetime.fromisoformat(clean_date_str)
            except ValueError:
                # Запасной вариант для ISO-подобных форматов
                date_format = (
                    "%Y-%m-%dT%H:%M:%S"
                    if "T" in clean_date_str
                    else "%Y-%m-%d %H:%M:%S"
                )
                date_obj = datetime.strptime(clean_date_str, date_format)
        else:
            # Пробуем стандартные форматы
            formats = [
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d",
                "%d/%m/%Y",
                "%m/%d/%Y",
                "%d.%m.%Y",
            ]
            for fmt in formats:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    break
                except ValueError:
                    continue
            else:
                return date_str  # Если ни один формат не подошел

        # Форматируем дату в читабельный вид
        return date_obj.strftime("%d.%m.%Y %H:%M")

    except Exception as e:
        logger.error(f"Ошибка форматирования даты {date_str}: {e}")
        return date_str


@router.get("", response_model=List[Dict[str, Any]])
async def get_reports(
    report_type: Optional[ReportType] = Query(
        None, description="Фильтр по типу отчета"
    ),
    current_user: User = Depends(get_current_user),
):
    """Получение доступных отчетов"""
    all_reports = [
        {
            "id": 1,
            "name": "Сводка данных датчиков",
            "type": ReportType.SENSOR_DATA,
            "description": "Сводка данных датчиков за указанный период",
            "parameters": ["start_date", "end_date", "sensor_type", "location_id"],
        },
        {
            "id": 2,
            "name": "Внесение удобрений",
            "type": ReportType.FERTILIZER_APPLICATIONS,
            "description": "Сводка внесения удобрений за указанный период",
            "parameters": ["start_date", "end_date", "fertilizer_type", "location_id"],
        },
        {
            "id": 3,
            "name": "Активность устройств",
            "type": ReportType.DEVICE_ACTIVITY,
            "description": "Журнал активности устройств",
            "parameters": ["start_date", "end_date", "device_type", "device_id"],
        },
        {
            "id": 4,
            "name": "Системная активность",
            "type": ReportType.SYSTEM_ACTIVITY,
            "description": "Журнал системной активности, включая действия пользователей",
            "parameters": ["start_date", "end_date", "user_id", "action_type"],
        },
        {
            "id": 5,
            "name": "Произвольный отчет",
            "type": ReportType.CUSTOM,
            "description": "Произвольный отчет с пользовательскими параметрами",
            "parameters": ["start_date", "end_date", "query"],
        },
    ]

    if report_type:
        return [report for report in all_reports if report["type"] == report_type]

    return all_reports


@router.get("/templates", response_model=Dict[str, Any])
async def get_report_templates(
    report_type: Optional[ReportType] = Query(
        None, description="Фильтр по типу отчета"
    ),
    current_user: User = Depends(get_current_user),
):
    """Получение шаблонов отчетов (эндпоинт для фронтенда)"""
    templates = [
        {
            "id": 1,
            "name": "Сводка данных датчиків",
            "type": "sensor_data",
            "description": "Зведення даних датчиків за вказаний період",
            "parameters": ["start_date", "end_date", "sensor_type", "location_id"],
        },
        {
            "id": 2,
            "name": "Внесення добрив",
            "type": "fertilizer_applications",
            "description": "Зведення внесення добрив за вказаний період",
            "parameters": ["start_date", "end_date", "fertilizer_type", "location_id"],
        },
        {
            "id": 3,
            "name": "Активність пристроїв",
            "type": "device_activity",
            "description": "Журнал активності пристроїв",
            "parameters": ["start_date", "end_date", "device_type", "device_id"],
        },
    ]

    if report_type:
        filtered_templates = [t for t in templates if t["type"] == report_type]
        return {"success": True, "data": filtered_templates}

    return {"success": True, "data": templates}


@router.get("/saved", response_model=Dict[str, Any])
async def get_saved_reports(
    current_user: User = Depends(get_current_user),
):
    """Получение сохраненных отчетов (эндпоинт для фронтенда)"""
    # Получаем отчеты текущего пользователя
    user_reports = _generated_reports.get(current_user.id, [])

    # Если нет сохраненных отчетов, возвращаем демо-данные
    if not user_reports:
        saved_reports = [
            {
                "id": "report-1",
                "name": "Звіт_температура_2023-10-15",
                "date": "15.10.2023, 14:30:22",
                "size": "1.45 MB",
                "type": "daily",
                "format": "pdf",
                "url": "/reports/download/report-1.pdf",
            },
            {
                "id": "report-2",
                "name": "Звіт_вологість_ґрунту_2023-10-10",
                "date": "10.10.2023, 09:15:07",
                "size": "2.12 MB",
                "type": "weekly",
                "format": "xlsx",
                "url": "/reports/download/report-2.xlsx",
            },
            {
                "id": "report-3",
                "name": "Звіт_всі_показники_2023-09-30",
                "date": "30.09.2023, 18:45:33",
                "size": "3.78 MB",
                "type": "monthly",
                "format": "pdf",
                "url": "/reports/download/report-3.pdf",
            },
        ]
    else:
        saved_reports = user_reports

    return {"success": True, "data": saved_reports}


@router.get("/{report_id}/download", response_model=Dict[str, Any])
async def download_report(
    report_id: str,
    format: Optional[ReportFormat] = None,
    current_user: User = Depends(get_current_user),
):
    """Скачивание отчета (эндпоинт для фронтенда)"""
    # Ищем отчет в сохраненных отчетах текущего пользователя
    report = None
    if current_user.id in _generated_reports:
        for r in _generated_reports[current_user.id]:
            if r["id"] == report_id:
                report = r
                break

    # Если отчет не найден для текущего пользователя и пользователь не админ,
    # проверяем все отчеты (для обратной совместимости)
    if not report:
        for user_id, reports in _generated_reports.items():
            for r in reports:
                if r["id"] == report_id:
                    # Проверяем, принадлежит ли отчет пользователю или пользователь админ
                    if user_id == current_user.id or getattr(
                        current_user, "is_superuser", False
                    ):
                        report = r
                        break
            if report:
                break

    if not report:
        # Для демонстрации вернем заглушку
        return {
            "success": True,
            "data": {"download_url": f"/mock-reports/{report_id}.{format or 'pdf'}"},
        }

    return {
        "success": True,
        "data": {
            "download_url": report.get("file_url")
            or f"/api/reports/{report_id}/download.{format or report.get('format', 'pdf')}"
        },
    }


@router.post("/generate", response_model=Dict[str, Any])
async def generate_report(
    report_type: ReportType = Body(..., embed=True),
    parameters: Dict[str, Any] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Генерация отчета на основе типа и параметров"""
    # Валидация параметров
    for date_param in ["start_date", "end_date"]:
        if date_param in parameters:
            try:
                parameters[date_param] = datetime.fromisoformat(parameters[date_param])
            except (ValueError, TypeError):
                # Если дата не парсится, считаем что передали строку, выбрасываем ошибку
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Неверный формат {date_param}. Используйте ISO формат (YYYY-MM-DDTHH:MM:SS).",
                )

    # Установка периода по умолчанию, если не указан
    if "start_date" not in parameters and "end_date" not in parameters:
        end_date = datetime.utcnow().replace(tzinfo=None)
        start_date = end_date - timedelta(days=7)
        parameters["start_date"] = start_date
        parameters["end_date"] = end_date

    # Импортируем сервис отчетов
    from app.services.report_service import ReportService

    try:
        # Генерация отчета с использованием нового сервиса
        if report_type == ReportType.SENSOR_DATA:
            report_data = await ReportService.generate_sensor_report(
                user_id=current_user.id,
                start_date=parameters.get("start_date"),
                end_date=parameters.get("end_date"),
                sensor_type=parameters.get("sensor_type"),
                location_id=parameters.get("location_id"),
            )
        elif report_type == ReportType.FERTILIZER_APPLICATIONS:
            report_data = await ReportService.generate_fertilizer_report(
                user_id=current_user.id,
                start_date=parameters.get("start_date"),
                end_date=parameters.get("end_date"),
                fertilizer_type=parameters.get("fertilizer_type"),
                location_id=parameters.get("location_id"),
            )
        elif report_type == ReportType.DEVICE_ACTIVITY:
            report_data = await ReportService.generate_device_report(
                user_id=current_user.id,
                start_date=parameters.get("start_date"),
                end_date=parameters.get("end_date"),
                device_type=parameters.get("device_type"),
                device_id=parameters.get("device_id"),
            )
        elif report_type == ReportType.SYSTEM_ACTIVITY:
            # Пока используем существующую реализацию
            report_data = await generate_system_activity_report(
                parameters, current_user
            )
        elif report_type == ReportType.CUSTOM:
            # Пока используем существующую реализацию
            report_data = await generate_custom_report(parameters, current_user)

        # Создаем отчет для фронтенда
        report_format = parameters.get("format", "pdf")
        report_id = f"report-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        # Генерируем имя отчета
        category = parameters.get("sensor_type", "all")
        date_str = datetime.utcnow().strftime("%Y-%m-%d")

        category_translations = {
            "temperature": "температура",
            "soil_moisture": "вологість_ґрунту",
            "humidity": "вологість_повітря",
            "fertilizer": "внесення_добрив",
            "all": "всі_показники",
        }

        category_name = category_translations.get(category, category)
        report_name = f"Звіт_{category_name}_{date_str}"

        # Рассчитываем размер отчета
        size = f"{(len(json.dumps(report_data)) / 1024 / 10):.2f} MB"

        # Сохраняем отчет в файловой системе
        # Создаем директорию для отчетов, если она не существует
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)

        # Сохраняем данные отчета в файл
        with open(f"{reports_dir}/{report_id}.json", "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        # Сохраняем в хранилище отчетов с привязкой к пользователю
        frontend_report = {
            "id": report_id,
            "name": report_name,
            "date": datetime.utcnow().strftime("%d.%m.%Y, %H:%M:%S"),
            "size": size,
            "type": parameters.get("type", "daily"),
            "format": report_format,
            "file_url": f"/api/reports/{report_id}/download.{report_format}",
            "user_id": current_user.id,  # Добавляем ID пользователя для привязки
            "created_by": current_user.username,  # Добавляем имя создателя
            "content": report_data,  # Сохраняем содержимое для скачивания
        }

        # Инициализируем список отчетов для пользователя, если его еще нет
        if current_user.id not in _generated_reports:
            _generated_reports[current_user.id] = []

        # Добавляем отчет в список пользователя
        _generated_reports[current_user.id].insert(0, frontend_report)

        # Ограничиваем количество сохраненных отчетов (только 20 последних)
        if len(_generated_reports[current_user.id]) > 20:
            _generated_reports[current_user.id] = _generated_reports[current_user.id][
                :20
            ]

        # Возвращаем информацию об отчете для фронтенда
        return {
            "success": True,
            "data": {
                "report_id": report_id,
                "name": report_name,
                "size": size,
                "file_url": f"/api/reports/{report_id}/download.{report_format}",
            },
        }
    except Exception as e:
        # Логируем ошибку и возвращаем 500
        logger.error(f"Ошибка при генерации отчета: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при генерации отчета: {str(e)}",
        )


@router.get("/{report_id}/download.{format}", response_class=Response)
async def serve_report_file(
    report_id: str,
    format: ReportFormat,
    current_user: User = Depends(get_current_user),
):
    """Отдает файл отчета в указанном формате"""

    # Проверяем, принадлежит ли отчет пользователю
    report_belongs_to_user = False
    report_data = None

    # Сначала ищем среди отчетов текущего пользователя
    if current_user.id in _generated_reports:
        for report in _generated_reports[current_user.id]:
            if report["id"] == report_id:
                report_belongs_to_user = True
                if "content" in report:
                    report_data = report["content"]
                break

    # Если не нашли или пользователь админ, ищем среди всех отчетов
    if not report_belongs_to_user or getattr(current_user, "is_superuser", False):
        for user_id, reports in _generated_reports.items():
            for report in reports:
                if report["id"] == report_id:
                    # Админ может просматривать все отчеты, обычный пользователь - только свои
                    if user_id == current_user.id or getattr(
                        current_user, "is_superuser", False
                    ):
                        report_belongs_to_user = True
                        if "content" in report:
                            report_data = report["content"]
                        break
            if report_data:
                break

    # Если нашли отчет в памяти, используем его
    if report_data:
        content = report_data
    else:
        # Иначе пытаемся загрузить из файла (для обратной совместимости)
        try:
            # Создаем директорию для отчетов, если она не существует
            reports_dir = "reports"
            if not os.path.exists(reports_dir):
                os.makedirs(reports_dir)

            with open(f"reports/{report_id}.json", "r", encoding="utf-8") as f:
                content = json.load(f)
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Отчет не найден",
            )

    # Формируем безопасное имя файла (без кириллицы)
    report_type = content.get("type", "unknown")
    generated_date = datetime.now().strftime("%Y-%m-%d")

    # Используем латиницу вместо кириллицы в имени файла
    if report_type == "sensor_data":
        report_name = f"sensor_data_report_{generated_date}"
    elif report_type == "fertilizer_applications":
        report_name = f"fertilizer_report_{generated_date}"
    elif report_type == "device_activity":
        report_name = f"device_activity_{generated_date}"
    elif report_type == "system_activity":
        report_name = f"system_activity_{generated_date}"
    else:
        report_name = f"report_{generated_date}"

    # Возвращаем файл в нужном формате
    if format == ReportFormat.JSON:
        return Response(
            content=json.dumps(content, ensure_ascii=False),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={report_name}.json"},
        )

    elif format == ReportFormat.CSV:
        csv_content = convert_to_csv(content)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_name}.csv"},
        )

    elif format == ReportFormat.EXCEL:
        try:
            excel_content = create_excel(content)
            return Response(
                content=excel_content,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={report_name}.xlsx"
                },
            )
        except Exception as e:
            # В случае ошибки возвращаем CSV
            logger.error(f"Ошибка при создании Excel файла: {e}")
            csv_content = convert_to_csv(content)
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={report_name}.csv"
                },
            )

    else:  # PDF or default
        # Для PDF используем специальную функцию создания файла
        try:
            pdf_content = create_pdf(content)
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={report_name}.pdf"
                },
            )
        except Exception as e:
            # В случае ошибки возвращаем HTML
            logger.error(f"Ошибка при создании PDF файла: {e}")
            html_content = convert_to_html(content)
            return Response(
                content=html_content,
                media_type="text/html",
                headers={
                    "Content-Disposition": f"attachment; filename={report_name}.html"
                },
            )


# Добавляем удаление отчета пользователя
@router.delete("/{report_id}", response_model=Dict[str, Any])
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    """Удаление отчета пользователя"""
    # Проверяем, есть ли у пользователя отчеты вообще
    if current_user.id not in _generated_reports:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="У пользователя нет отчетов",
        )

    # Ищем отчет среди отчетов пользователя
    report_index = -1
    for i, report in enumerate(_generated_reports[current_user.id]):
        if report["id"] == report_id:
            report_index = i
            break

    if report_index == -1:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отчет не найден у текущего пользователя",
        )

    # Удаляем отчет из списка пользователя
    _generated_reports[current_user.id].pop(report_index)

    # Пытаемся удалить файл отчета, если он существует
    try:
        file_path = f"reports/{report_id}.json"
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Ошибка при удалении файла отчета: {e}")

    return {"success": True, "message": "Отчет успешно удален", "report_id": report_id}


# Дополнительные функции для генерации отчетов
async def generate_system_activity_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """Генерация отчета о системной активности"""
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    user_id = parameters.get("user_id")
    action_type = parameters.get("action_type")

    # Создаем тестовые данные системной активности
    system_activities = [
        {
            "id": 1,
            "user_id": 1,
            "username": "admin",
            "action_type": "login",
            "timestamp": format_date(
                (datetime.utcnow() - timedelta(hours=1))
                .replace(tzinfo=None)
                .strftime("%Y-%m-%d %H:%M:%S")
            ),
            "details": {"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"},
            "status": "success",
        },
        {
            "id": 2,
            "user_id": 2,
            "username": "manager",
            "action_type": "data_export",
            "timestamp": (datetime.utcnow() - timedelta(hours=3))
            .replace(tzinfo=None)
            .strftime("%Y-%m-%d %H:%M:%S"),
            "details": {"export_type": "csv", "records_count": 250},
            "status": "success",
        },
        {
            "id": 3,
            "user_id": 1,
            "username": "admin",
            "action_type": "settings_change",
            "timestamp": (datetime.utcnow() - timedelta(hours=5))
            .replace(tzinfo=None)
            .strftime("%Y-%m-%d %H:%M:%S"),
            "details": {
                "setting": "notification_threshold",
                "old_value": 10,
                "new_value": 15,
            },
            "status": "success",
        },
        {
            "id": 4,
            "user_id": 3,
            "username": "operator",
            "action_type": "fertilizer_application",
            "timestamp": (datetime.utcnow() - timedelta(hours=8))
            .replace(tzinfo=None)
            .strftime("%Y-%m-%d %H:%M:%S"),
            "details": {"fertilizer_id": 2, "location": "vineyard-section-B"},
            "status": "success",
        },
        {
            "id": 5,
            "user_id": 2,
            "username": "manager",
            "action_type": "report_generation",
            "timestamp": (datetime.utcnow() - timedelta(hours=10))
            .replace(tzinfo=None)
            .strftime("%Y-%m-%d %H:%M:%S"),
            "details": {"report_type": "sensor_data", "format": "pdf"},
            "status": "success",
        },
    ]

    # Отфильтруем данные по параметрам
    filtered_activities = []
    users = set()
    action_types = set()

    for activity in system_activities:
        # Фильтр по ID пользователя
        if user_id and activity["user_id"] != user_id:
            continue

        # Фильтр по типу действия
        if action_type and activity["action_type"] != action_type:
            continue

        # Фильтр по дате начала
        if start_date:
            activity_date = datetime.fromisoformat(activity["timestamp"])
            if start_date.tzinfo and not activity_date.tzinfo:
                activity_date = activity_date.replace(tzinfo=start_date.tzinfo)
            if activity_date < start_date:
                continue

        # Фильтр по дате окончания
        if end_date:
            activity_date = datetime.fromisoformat(activity["timestamp"])
            if end_date.tzinfo and not activity_date.tzinfo:
                activity_date = activity_date.replace(tzinfo=end_date.tzinfo)
            if activity_date > end_date:
                continue

        users.add(activity["username"])
        action_types.add(activity["action_type"])
        filtered_activities.append(activity)

    return {
        "type": ReportType.SYSTEM_ACTIVITY,
        "generated_at": format_date(datetime.utcnow().isoformat()),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": format_date(start_date.isoformat() if start_date else None),
            "end_date": format_date(end_date.isoformat() if end_date else None),
            "user_id": user_id,
            "action_type": action_type,
        },
        "summary": {
            "total_activities": len(filtered_activities),
            "users": list(users),
            "action_types": list(action_types),
            "date_range": {
                "start": format_date(start_date.isoformat() if start_date else None),
                "end": format_date(end_date.isoformat() if end_date else None),
            },
        },
        "data": filtered_activities,
    }


async def generate_custom_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """Генерация произвольного отчета"""
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    query = parameters.get("query", "").lower()

    # Создаем комбинированные данные для произвольного отчета
    custom_data = []

    # В зависимости от запроса формируем нужные данные
    if "температура" in query or "temperature" in query:
        custom_data.extend(
            [
                {
                    "date": (datetime.utcnow() - timedelta(hours=i))
                    .replace(tzinfo=None)
                    .strftime("%Y-%m-%d %H:%M:%S"),
                    "parameter": "temperature",
                    "value": round(22.5 + (i % 5), 1),
                    "unit": "°C",
                    "location": "Виноградник А",
                    "status": "normal",
                }
                for i in range(12)
            ]
        )

    if "влажность" in query or "humidity" in query:
        custom_data.extend(
            [
                {
                    "date": (datetime.utcnow() - timedelta(hours=i))
                    .replace(tzinfo=None)
                    .strftime("%Y-%m-%d %H:%M:%S"),
                    "parameter": "humidity",
                    "value": round(65.0 + (i % 10), 1),
                    "unit": "%",
                    "location": "Виноградник А",
                    "status": "normal",
                }
                for i in range(12)
            ]
        )

    if "удобрения" in query or "fertilizer" in query:
        custom_data.extend(
            [
                {
                    "date": (datetime.utcnow() - timedelta(days=i * 5))
                    .replace(tzinfo=None)
                    .strftime("%Y-%m-%d %H:%M:%S"),
                    "parameter": "fertilizer",
                    "fertilizer_type": [
                        "nitrogen",
                        "phosphorus",
                        "potassium",
                        "organic",
                    ][i % 4],
                    "amount": round(15.5 + (i * 2.5), 1),
                    "unit": "кг/га",
                    "location": "Виноградник А",
                    "status": "completed",
                }
                for i in range(4)
            ]
        )

    if "устройства" in query or "devices" in query:
        custom_data.extend(
            [
                {
                    "date": (datetime.utcnow() - timedelta(hours=i * 4))
                    .replace(tzinfo=None)
                    .strftime("%Y-%m-%d %H:%M:%S"),
                    "parameter": "device_activity",
                    "device_id": f"device-{i+1}",
                    "device_type": [
                        "sensor_hub",
                        "irrigation_controller",
                        "weather_station",
                    ][i % 3],
                    "status": "active",
                    "battery": 80 - (i * 5),
                }
                for i in range(5)
            ]
        )

    # Если ничего не найдено, добавляем общие данные
    if not custom_data:
        custom_data.extend(
            [
                {
                    "date": (datetime.utcnow() - timedelta(days=i))
                    .replace(tzinfo=None)
                    .strftime("%Y-%m-%d %H:%M:%S"),
                    "parameter": "general",
                    "value": f"Значение {i+1}",
                    "location": "Виноградник А",
                    "notes": f"Заметка для дня {i+1}",
                }
                for i in range(10)
            ]
        )

    # Отфильтруем по датам
    filtered_data = []
    for item in custom_data:
        # Фильтр по дате начала
        if start_date:
            item_date = datetime.fromisoformat(item["date"])
            if start_date.tzinfo and not item_date.tzinfo:
                item_date = item_date.replace(tzinfo=start_date.tzinfo)
            if item_date < start_date:
                continue

        # Фильтр по дате окончания
        if end_date:
            item_date = datetime.fromisoformat(item["date"])
            if end_date.tzinfo and not item_date.tzinfo:
                item_date = item_date.replace(tzinfo=end_date.tzinfo)
            if item_date > end_date:
                continue

        # Форматируем даты в данных
        if "date" in item and item["date"]:
            item["date"] = format_date(item["date"])

        filtered_data.append(item)

    return {
        "type": ReportType.CUSTOM,
        "generated_at": format_date(datetime.utcnow().isoformat()),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": format_date(start_date.isoformat() if start_date else None),
            "end_date": format_date(end_date.isoformat() if end_date else None),
            "query": query,
        },
        "summary": {
            "total_entries": len(filtered_data),
            "date_range": {
                "start": format_date(start_date.isoformat() if start_date else None),
                "end": format_date(end_date.isoformat() if end_date else None),
            },
            "query": query,
        },
        "data": filtered_data,
    }
