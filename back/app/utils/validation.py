import re
from typing import Any, Dict, Optional, Tuple, Union, List
from email_validator import validate_email, EmailNotValidError


def validate_email_address(email: str) -> Tuple[bool, Optional[str]]:
    """
    Проверка адреса электронной почты.

    Args:
        email: Адрес электронной почты для проверки

    Returns:
        Tuple[bool, Optional[str]]: (is_valid, error_message)
    """
    try:
        # Validate email and return normalized result
        validation = validate_email(email)
        return True, None
    except EmailNotValidError as e:
        return False, str(e)


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Проверка надежности пароля.

    Требования:
    - Хотя бы 8 символов
    - Содержит хотя бы одну заглавную букву
    - Содержит хотя бы одну строчную букву
    - Содержит хотя бы одну цифру
    - Содержит хотя бы один специальный символ

    Args:
        password: Пароль для проверки

    Returns:
        Tuple[bool, Optional[str]]: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Пароль должен быть не менее 8 символов"

    if not re.search(r"[A-Z]", password):
        return False, "Пароль должен содержать хотя бы одну заглавную букву"

    if not re.search(r"[a-z]", password):
        return False, "Пароль должен содержать хотя бы одну строчную букву"

    if not re.search(r"[0-9]", password):
        return False, "Пароль должен содержать хотя бы одну цифру"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Пароль должен содержать хотя бы один специальный символ"

    return True, None


def validate_ip_address(ip: str) -> bool:
    """
    Проверка IP-адреса.

    Args:
        ip: IP-адрес для проверки

    Returns:
        bool: True, если IP-адрес действителен, False в противном случае
    """
    # Regex pattern for IPv4
    ipv4_pattern = r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$"

    if not re.match(ipv4_pattern, ip):
        return False

    # Check if octets are valid (0-255)
    octets = ip.split(".")
    for octet in octets:
        if not (0 <= int(octet) <= 255):
            return False

    return True


def validate_mac_address(mac: str) -> bool:
    """
    Проверьте MAC-адрес.

    Args:
        mac: MAC-адрес для проверки

    Returns:
        bool: True, если MAC-адрес действителен, False в противном случае
    """
    # Regex pattern for MAC address (e.g., 00:1A:2B:3C:4D:5E or 00-1A-2B-3C-4D-5E)
    mac_pattern = r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"

    return bool(re.match(mac_pattern, mac))


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """
    Проверка географических координат.

    Args:
        latitude: Широта (-90 до 90)
        longitude: Долгота (-180 до 180)

    Returns:
        bool: True, если координаты действительны, False в противном случае
    """
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def clean_input(text: str) -> str:
    """
    Очистка и очистка входного текста.

    Args:
        text: Текст для очистки

    Returns:
        str: Очищенный текст
    """
    # Удалить любые HTML-теги
    text = re.sub(r"<[^>]*>", "", text)

    # Удалить несколько пробелов
    text = re.sub(r"\s+", " ", text)

    # Обрезать пробелы
    text = text.strip()

    return text
