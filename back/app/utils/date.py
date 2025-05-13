from datetime import datetime, timedelta, date
from typing import Optional, Tuple, Union, List

import pytz


def get_utc_now() -> datetime:
    """
    Получить текущую дату и время в UTC.

    Returns:
        datetime: Текущая дата и время в UTC
    """
    return datetime.now(pytz.UTC)


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Преобразовать объект datetime в строку.

    Args:
        dt: Дата и время для форматирования
        format_str: Строка формата

    Returns:
        str: Отформатированная строка даты и времени
    """
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)

    return dt.strftime(format_str)


def parse_datetime(dt_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> datetime:
    """
    Преобразовать строку даты и времени в объект datetime.

    Args:
        dt_str: Строка даты и времени
        format_str: Строка формата

    Returns:
        datetime: Преобразованная дата и время

    Raises:
        ValueError: Если строка не может быть преобразована
    """
    dt = datetime.strptime(dt_str, format_str)
    return pytz.UTC.localize(dt)


def get_date_range(
    start_date: Optional[Union[date, datetime]] = None,
    end_date: Optional[Union[date, datetime]] = None,
    days: Optional[int] = None,
) -> Tuple[date, date]:
    """
    Получить диапазон дат.

    Если start_date и end_date предоставлены, возвращают их.
    Если предоставлена только start_date, возвращают (start_date, start_date + days)
    Если предоставлена только end_date, возвращают (end_date - days, end_date)
    Если ничего не предоставлено, возвращают (today - days, today)

    Args:
        start_date: Необязательная начальная дата
        end_date: Необязательная конечная дата
        days: Количество дней в диапазоне (по умолчанию: 7)

    Returns:
        Tuple[date, date]: (start_date, end_date)
    """
    if days is None:
        days = 7

    today = date.today()

    if start_date is None and end_date is None:
        # Default to last N days
        return today - timedelta(days=days), today

    if isinstance(start_date, datetime):
        start_date = start_date.date()

    if isinstance(end_date, datetime):
        end_date = end_date.date()

    if start_date is not None and end_date is not None:
        # Both dates provided
        return start_date, end_date

    if start_date is not None:
        # Only start date provided
        return start_date, start_date + timedelta(days=days)

    # Only end date provided
    return end_date - timedelta(days=days), end_date


def get_start_of_day(dt: Optional[datetime] = None) -> datetime:
    """
    Получить начало дня (00:00:00) для заданной даты и времени.

    Args:
        dt: Необязательная дата и время (по умолчанию: текущая дата и время)

    Returns:
        datetime: Начало дня
    """
    if dt is None:
        dt = datetime.now()

    return datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=dt.tzinfo)


def get_end_of_day(dt: Optional[datetime] = None) -> datetime:
    """
    Получить конец дня (23:59:59) для заданной даты и времени.

    Args:
        dt: Необязательная дата и время (по умолчанию: текущая дата и время)

    Returns:
        datetime: Конец дня
    """
    if dt is None:
        dt = datetime.now()

    return datetime(dt.year, dt.month, dt.day, 23, 59, 59, tzinfo=dt.tzinfo)


def get_date_range_list(start_date: date, end_date: date) -> List[date]:
    """
    Получить список дат между start_date и end_date (включительно).

    Args:
        start_date: Начальная дата
        end_date: Конечная дата

    Returns:
        List[date]: Список дат
    """
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
