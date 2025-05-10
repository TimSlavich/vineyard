from datetime import datetime, timedelta, date
from typing import Optional, Tuple, Union, List

import pytz


def get_utc_now() -> datetime:
    """
    Get current UTC datetime.

    Returns:
        datetime: Current UTC datetime
    """
    return datetime.now(pytz.UTC)


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format datetime object to string.

    Args:
        dt: Datetime to format
        format_str: Format string

    Returns:
        str: Formatted datetime string
    """
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)

    return dt.strftime(format_str)


def parse_datetime(dt_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> datetime:
    """
    Parse datetime string to datetime object.

    Args:
        dt_str: Datetime string
        format_str: Format string

    Returns:
        datetime: Parsed datetime

    Raises:
        ValueError: If string cannot be parsed
    """
    dt = datetime.strptime(dt_str, format_str)
    return pytz.UTC.localize(dt)


def get_date_range(
    start_date: Optional[Union[date, datetime]] = None,
    end_date: Optional[Union[date, datetime]] = None,
    days: Optional[int] = None,
) -> Tuple[date, date]:
    """
    Get a date range.

    If start_date and end_date are provided, returns them.
    If only start_date is provided, returns (start_date, start_date + days)
    If only end_date is provided, returns (end_date - days, end_date)
    If none are provided, returns (today - days, today)

    Args:
        start_date: Optional start date
        end_date: Optional end date
        days: Number of days in range (default: 7)

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
    Get the start of day (00:00:00) for the given datetime.

    Args:
        dt: Optional datetime (default: now)

    Returns:
        datetime: Start of day
    """
    if dt is None:
        dt = datetime.now()

    return datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=dt.tzinfo)


def get_end_of_day(dt: Optional[datetime] = None) -> datetime:
    """
    Get the end of day (23:59:59) for the given datetime.

    Args:
        dt: Optional datetime (default: now)

    Returns:
        datetime: End of day
    """
    if dt is None:
        dt = datetime.now()

    return datetime(dt.year, dt.month, dt.day, 23, 59, 59, tzinfo=dt.tzinfo)


def get_date_range_list(start_date: date, end_date: date) -> List[date]:
    """
    Get a list of dates between start_date and end_date (inclusive).

    Args:
        start_date: Start date
        end_date: End date

    Returns:
        List[date]: List of dates
    """
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
