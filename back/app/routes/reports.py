from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import os
import json
import base64
import io
import csv
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, Query, HTTPException, status, Body, Response
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse

from app.deps.auth import get_current_user
from app.models.user import User
from app.models.sensor_data import SensorData
from app.models.fertilizer_application import FertilizerApplication

# Добавляем библиотеки для генерации PDF и Excel
try:
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
except ImportError:
    # Если библиотеки не установлены, будем использовать заглушки
    pass


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
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


# Create reports router
router = APIRouter()


# Хранилище отчетов (в реальном приложении использовалась бы база данных)
_generated_reports = {}


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
                "format": "excel",
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
    # Ищем отчет в сохраненных
    report = None
    for user_id, reports in _generated_reports.items():
        for r in reports:
            if r["id"] == report_id:
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

    # Генерация отчета в зависимости от типа
    report_generators = {
        ReportType.SENSOR_DATA: generate_sensor_data_report,
        ReportType.FERTILIZER_APPLICATIONS: generate_fertilizer_report,
        ReportType.DEVICE_ACTIVITY: generate_device_activity_report,
        ReportType.SYSTEM_ACTIVITY: generate_system_activity_report,
        ReportType.CUSTOM: generate_custom_report,
    }

    generator = report_generators.get(report_type)
    if not generator:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый тип отчета: {report_type}",
        )

    try:
        report_data = await generator(parameters, current_user)

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

        # Сохраняем отчет
        frontend_report = {
            "id": report_id,
            "name": report_name,
            "date": datetime.utcnow().strftime("%d.%m.%Y, %H:%M:%S"),
            "size": size,
            "type": parameters.get("type", "daily"),
            "format": report_format,
            "file_url": f"/api/reports/{report_id}/download.{report_format}",
            "content": report_data,  # Сохраняем содержимое для скачивания
        }

        # Сохраняем в хранилище отчетов
        if current_user.id not in _generated_reports:
            _generated_reports[current_user.id] = []

        _generated_reports[current_user.id].insert(0, frontend_report)

        # Ограничиваем количество сохраненных отчетов
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
    """Отдает файл отчета для скачивания"""
    # Ищем отчет в сохраненных
    report = None
    for user_id, reports in _generated_reports.items():
        for r in reports:
            if r["id"] == report_id:
                report = r
                break
        if report:
            break

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Отчет не найден: {report_id}",
        )

    # Получаем содержимое отчета
    content = report.get("content", {})
    report_name = report.get("name", report_id)

    # Генерируем файл в зависимости от формата
    if format == ReportFormat.JSON:
        # Для JSON просто возвращаем данные
        return JSONResponse(content=content)

    elif format == ReportFormat.CSV:
        # Для CSV конвертируем данные
        csv_content = convert_to_csv(content)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_name}.csv"},
        )

    elif format == ReportFormat.EXCEL:
        # Для Excel используем специальную функцию создания файла
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


def convert_to_csv(content: Dict[str, Any]) -> str:
    """Конвертирует данные отчета в CSV формат"""
    try:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")

        # Заголовок отчета
        writer.writerow(["Отчет", "Дата генерации"])
        writer.writerow([content.get("type", ""), content.get("generated_at", "")])
        writer.writerow([])

        # Параметры отчета
        writer.writerow(["Параметры отчета"])
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
                            writer.writerow([str(record.get(h, "")) for h in headers])
                        writer.writerow([])

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                # Заголовки
                headers = list(content["data"][0].keys())
                writer.writerow(headers)

                # Данные
                for record in content["data"]:
                    writer.writerow([str(record.get(h, "")) for h in headers])

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
        print(f"Error converting to CSV: {e}")
        return "Error generating CSV report"


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
        worksheet = workbook.add_worksheet("Отчет")
        worksheet.set_column(0, 0, 30)
        worksheet.set_column(1, 10, 20)

        # Заголовок
        row = 0
        worksheet.merge_range(
            row, 0, row, 5, f"Отчет: {content.get('type', '')}", title_format
        )
        row += 1
        worksheet.write(row, 0, "Дата генерации:", header_format)
        worksheet.write(row, 1, content.get("generated_at", ""), cell_format)
        row += 2

        # Параметры
        if "parameters" in content:
            worksheet.merge_range(row, 0, row, 5, "Параметры отчета", section_format)
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
                                worksheet.write(
                                    row, col, record.get(header, ""), cell_format
                                )
                            row += 1
                        row += 1

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                worksheet.merge_range(row, 0, row, 5, "Данные", section_format)
                row += 1

                # Заголовки
                headers = list(content["data"][0].keys())
                for col, header in enumerate(headers):
                    worksheet.write(row, col, header, header_format)
                row += 1

                # Данные
                for record in content["data"]:
                    for col, header in enumerate(headers):
                        worksheet.write(row, col, record.get(header, ""), cell_format)
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
        print(f"Error creating Excel: {e}")
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

        # Пытаемся зарегистрировать кириллический шрифт
        try:
            pdfmetrics.registerFont(TTFont("Arial", "Arial.ttf"))
            title_style = ParagraphStyle(
                "CustomTitle",
                parent=styles["Heading1"],
                fontName="Arial",
                alignment=TA_CENTER,
                fontSize=16,
            )
            heading2_style = ParagraphStyle(
                "CustomHeading2",
                parent=styles["Heading2"],
                fontName="Arial",
                fontSize=14,
            )
            normal_style = ParagraphStyle(
                "CustomNormal", parent=styles["Normal"], fontName="Arial", fontSize=10
            )
        except:
            pass

        # Заголовок отчета
        elements.append(Paragraph(f"Отчет: {content.get('type', '')}", title_style))
        elements.append(
            Paragraph(
                f"Дата генерации: {content.get('generated_at', '')}", normal_style
            )
        )
        elements.append(
            Paragraph(
                f"Сгенерирован пользователем: {content.get('generated_by', '')}",
                normal_style,
            )
        )
        elements.append(Spacer(1, 20))

        # Параметры отчета
        if "parameters" in content:
            elements.append(Paragraph("Параметры отчета", heading2_style))
            data = []
            data.append(["Параметр", "Значение"])
            for key, value in content["parameters"].items():
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
            elements.append(Paragraph("Статистика по типам датчиков", heading2_style))
            for sensor_type, stats in content["statistics"].items():
                elements.append(
                    Paragraph(f"Тип датчика: {sensor_type}", heading2_style)
                )

                data = []
                data.append(["Показатель", "Значение"])
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
            elements.append(Paragraph("Данные", heading2_style))

            # Для данных датчиков
            if isinstance(content["data"], dict):
                for sensor_type, records in content["data"].items():
                    elements.append(
                        Paragraph(f"Тип датчика: {sensor_type}", heading2_style)
                    )

                    if records and isinstance(records, list) and records:
                        # Заголовки из первой записи
                        headers = list(records[0].keys())

                        # Формируем таблицу
                        data = [headers]  # Заголовок
                        for record in records[:50]:  # Ограничиваем количество строк
                            row = [str(record.get(h, "")) for h in headers]
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
                                    f"Показаны первые 50 из {len(records)} записей",
                                    normal_style,
                                )
                            )

                        elements.append(Spacer(1, 20))

            # Для списка записей
            elif isinstance(content["data"], list) and content["data"]:
                records = content["data"]

                # Заголовки из первой записи
                headers = list(records[0].keys())

                # Формируем таблицу
                data = [headers]  # Заголовок
                for record in records[:50]:  # Ограничиваем количество строк
                    row = [str(record.get(h, "")) for h in headers]
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
                            f"Показаны первые 50 из {len(records)} записей",
                            normal_style,
                        )
                    )

        # Создаем PDF
        doc.build(elements)
        return buffer.getvalue()

    except Exception as e:
        print(f"Error creating PDF: {e}")
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
            <title>Отчет</title>
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
        html += f"<h1>Отчет: {content.get('type', '')}</h1>"
        html += f"<p>Дата генерации: {content.get('generated_at', '')}</p>"
        html += f"<p>Сгенерирован пользователем: {content.get('generated_by', '')}</p>"

        # Параметры отчета
        if "parameters" in content:
            html += "<div class='section'>"
            html += "<h2>Параметры отчета</h2>"
            html += "<table>"
            html += "<tr><th>Параметр</th><th>Значение</th></tr>"
            for key, value in content["parameters"].items():
                html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table>"
            html += "</div>"

        # Сводная информация
        if "summary" in content:
            html += "<div class='section'>"
            html += "<h2>Сводная информация</h2>"
            html += "<table>"
            for key, value in content["summary"].items():
                if not isinstance(value, dict):
                    html += f"<tr><td>{key}</td><td>{value}</td></tr>"
            html += "</table>"
            html += "</div>"

        # Статистика
        if "statistics" in content:
            html += "<div class='section'>"
            html += "<h2>Статистика по типам датчиков</h2>"
            for sensor_type, stats in content["statistics"].items():
                html += f"<h3>Тип датчика: {sensor_type}</h3>"
                html += "<table>"
                html += "<tr><th>Показатель</th><th>Значение</th></tr>"
                for key, value in stats.items():
                    html += f"<tr><td>{key}</td><td>{value}</td></tr>"
                html += "</table>"
            html += "</div>"

        # Данные
        if "data" in content:
            html += "<div class='section'>"
            html += "<h2>Данные</h2>"

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
        print(f"Error converting to HTML: {e}")
        return "<html><body><h1>Error generating HTML report</h1></body></html>"


async def generate_sensor_data_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """Генерация отчета по данным датчиков"""
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    sensor_type = parameters.get("sensor_type")
    location_id = parameters.get("location_id")

    # Создаем тестовые данные вместо запроса к базе
    sensor_data = {
        "temperature": [
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=i))
                .replace(tzinfo=None)
                .isoformat(),
                "value": 22.5 + (i % 5),
                "unit": "°C",
                "sensor_id": "temp-sensor-01",
                "location_id": "vineyard-section-A",
                "status": "normal",
            }
            for i in range(24)
        ],
        "humidity": [
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=i))
                .replace(tzinfo=None)
                .isoformat(),
                "value": 65.0 + (i % 10),
                "unit": "%",
                "sensor_id": "hum-sensor-01",
                "location_id": "vineyard-section-A",
                "status": "normal",
            }
            for i in range(24)
        ],
        "soil_moisture": [
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=i))
                .replace(tzinfo=None)
                .isoformat(),
                "value": 42.0 + (i % 7),
                "unit": "%",
                "sensor_id": "soil-moist-sensor-01",
                "location_id": "vineyard-section-A",
                "status": "normal",
            }
            for i in range(24)
        ],
    }

    # Отфильтруем данные по параметрам
    results_by_type = {}
    for type_name, records in sensor_data.items():
        if sensor_type and type_name != sensor_type:
            continue

        results_by_type[type_name] = []
        for record in records:
            # Фильтр по местоположению
            if location_id and record["location_id"] != location_id:
                continue

            # Фильтр по дате начала
            if start_date:
                record_date = datetime.fromisoformat(record["timestamp"])
                # Если start_date имеет timezone, а record_date нет, добавляем timezone к record_date
                if start_date.tzinfo and not record_date.tzinfo:
                    record_date = record_date.replace(tzinfo=start_date.tzinfo)
                if record_date < start_date:
                    continue

            # Фильтр по дате окончания
            if end_date:
                record_date = datetime.fromisoformat(record["timestamp"])
                # Если end_date имеет timezone, а record_date нет, добавляем timezone к record_date
                if end_date.tzinfo and not record_date.tzinfo:
                    record_date = record_date.replace(tzinfo=end_date.tzinfo)
                if record_date > end_date:
                    continue

            results_by_type[type_name].append(record)

    # Если пустой список, удаляем тип
    for type_name in list(results_by_type.keys()):
        if not results_by_type[type_name]:
            del results_by_type[type_name]

    # Расчет статистики для каждого типа датчиков
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

    # Подготовка отчета
    return {
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


async def generate_fertilizer_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """Генерация отчета о внесении удобрений"""
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    fertilizer_type = parameters.get("fertilizer_type")
    location_id = parameters.get("location_id")

    # Создаем тестовые данные вместо запроса к базе данных
    fertilizer_data = [
        {
            "id": 1,
            "name": "Весеннее удобрение",
            "fertilizer_type": "nitrogen",
            "application_date": (datetime.utcnow() - timedelta(days=5))
            .replace(tzinfo=None)
            .isoformat(),
            "application_method": "broadcast",
            "amount": 15.5,
            "unit": "кг/га",
            "location_id": "vineyard-section-A",
            "status": "completed",
            "created_by_id": 1,
        },
        {
            "id": 2,
            "name": "Фосфорное удобрение",
            "fertilizer_type": "phosphorus",
            "application_date": (datetime.utcnow() - timedelta(days=10))
            .replace(tzinfo=None)
            .isoformat(),
            "application_method": "drip",
            "amount": 8.75,
            "unit": "л/га",
            "location_id": "vineyard-section-B",
            "status": "completed",
            "created_by_id": 1,
        },
        {
            "id": 3,
            "name": "Органическое удобрение",
            "fertilizer_type": "organic",
            "application_date": (datetime.utcnow() - timedelta(days=15))
            .replace(tzinfo=None)
            .isoformat(),
            "application_method": "manual",
            "amount": 200.0,
            "unit": "кг/га",
            "location_id": "vineyard-section-A",
            "status": "completed",
            "created_by_id": 1,
        },
        {
            "id": 4,
            "name": "Калийное удобрение",
            "fertilizer_type": "potassium",
            "application_date": (datetime.utcnow() - timedelta(days=3))
            .replace(tzinfo=None)
            .isoformat(),
            "application_method": "foliar_spray",
            "amount": 5.25,
            "unit": "л/га",
            "location_id": "vineyard-section-C",
            "status": "completed",
            "created_by_id": 1,
        },
    ]

    # Отфильтруем данные по параметрам
    applications = []
    total_amount = 0
    fertilizer_types = set()

    for app in fertilizer_data:
        # Фильтр по типу удобрения
        if fertilizer_type and app["fertilizer_type"] != fertilizer_type:
            continue

        # Фильтр по местоположению
        if location_id and app["location_id"] != location_id:
            continue

        # Фильтр по дате начала
        if start_date:
            app_date = datetime.fromisoformat(app["application_date"])
            if start_date.tzinfo and not app_date.tzinfo:
                app_date = app_date.replace(tzinfo=start_date.tzinfo)
            if app_date < start_date:
                continue

        # Фильтр по дате окончания
        if end_date:
            app_date = datetime.fromisoformat(app["application_date"])
            if end_date.tzinfo and not app_date.tzinfo:
                app_date = app_date.replace(tzinfo=end_date.tzinfo)
            if app_date > end_date:
                continue

        fertilizer_types.add(app["fertilizer_type"])
        total_amount += app["amount"]
        applications.append(app)

    # Подготовка отчета
    return {
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


async def generate_device_activity_report(
    parameters: Dict[str, Any], current_user: User
) -> Dict[str, Any]:
    """Генерация отчета об активности устройств"""
    start_date = parameters.get("start_date")
    end_date = parameters.get("end_date")
    device_type = parameters.get("device_type")
    device_id = parameters.get("device_id")

    # Создаем тестовые данные активности устройств
    device_activities = [
        {
            "id": 1,
            "device_id": "sensor-hub-001",
            "device_type": "sensor_hub",
            "activity_type": "data_collection",
            "timestamp": (datetime.utcnow() - timedelta(hours=2))
            .replace(tzinfo=None)
            .isoformat(),
            "status": "success",
            "details": {"sensors_read": 12, "data_points": 48},
        },
        {
            "id": 2,
            "device_id": "sensor-hub-002",
            "device_type": "sensor_hub",
            "activity_type": "data_collection",
            "timestamp": (datetime.utcnow() - timedelta(hours=4))
            .replace(tzinfo=None)
            .isoformat(),
            "status": "success",
            "details": {"sensors_read": 8, "data_points": 32},
        },
        {
            "id": 3,
            "device_id": "irrigation-controller-001",
            "device_type": "irrigation_controller",
            "activity_type": "irrigation_cycle",
            "timestamp": (datetime.utcnow() - timedelta(hours=6))
            .replace(tzinfo=None)
            .isoformat(),
            "status": "success",
            "details": {"duration_minutes": 30, "water_volume_liters": 1500},
        },
        {
            "id": 4,
            "device_id": "weather-station-001",
            "device_type": "weather_station",
            "activity_type": "data_collection",
            "timestamp": (datetime.utcnow() - timedelta(hours=1))
            .replace(tzinfo=None)
            .isoformat(),
            "status": "success",
            "details": {
                "parameters_measured": [
                    "temperature",
                    "humidity",
                    "wind_speed",
                    "rainfall",
                ]
            },
        },
        {
            "id": 5,
            "device_id": "sensor-hub-001",
            "device_type": "sensor_hub",
            "activity_type": "calibration",
            "timestamp": (datetime.utcnow() - timedelta(hours=12))
            .replace(tzinfo=None)
            .isoformat(),
            "status": "success",
            "details": {"sensors_calibrated": 3},
        },
    ]

    # Отфильтруем данные по параметрам
    filtered_activities = []
    device_ids = set()
    device_types = set()

    for activity in device_activities:
        # Фильтр по типу устройства
        if device_type and activity["device_type"] != device_type:
            continue

        # Фильтр по ID устройства
        if device_id and activity["device_id"] != device_id:
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

        device_ids.add(activity["device_id"])
        device_types.add(activity["device_type"])
        filtered_activities.append(activity)

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
            "total_activities": len(filtered_activities),
            "devices": list(device_ids),
            "device_types": list(device_types),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        },
        "data": filtered_activities,
    }


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
            "timestamp": (datetime.utcnow() - timedelta(hours=1))
            .replace(tzinfo=None)
            .isoformat(),
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
            .isoformat(),
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
            .isoformat(),
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
            .isoformat(),
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
            .isoformat(),
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
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.username,
        "parameters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "user_id": user_id,
            "action_type": action_type,
        },
        "summary": {
            "total_activities": len(filtered_activities),
            "users": list(users),
            "action_types": list(action_types),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
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
                    .isoformat(),
                    "parameter": "temperature",
                    "value": 22.5 + (i % 5),
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
                    .isoformat(),
                    "parameter": "humidity",
                    "value": 65.0 + (i % 10),
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
                    .isoformat(),
                    "parameter": "fertilizer",
                    "fertilizer_type": [
                        "nitrogen",
                        "phosphorus",
                        "potassium",
                        "organic",
                    ][i % 4],
                    "amount": 15.5 + (i * 2.5),
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
                    .isoformat(),
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
                    .isoformat(),
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

        filtered_data.append(item)

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
            "total_entries": len(filtered_data),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
            "query": query,
        },
        "data": filtered_data,
    }
