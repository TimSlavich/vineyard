import re
from typing import Any, Dict, Optional, Tuple, Union, List
from email_validator import validate_email, EmailNotValidError


def validate_email_address(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email address.

    Args:
        email: Email address to validate

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
    Validate password strength.

    Requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character

    Args:
        password: Password to validate

    Returns:
        Tuple[bool, Optional[str]]: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"

    return True, None


def validate_ip_address(ip: str) -> bool:
    """
    Validate IP address.

    Args:
        ip: IP address to validate

    Returns:
        bool: True if valid IP address, False otherwise
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
    Validate MAC address.

    Args:
        mac: MAC address to validate

    Returns:
        bool: True if valid MAC address, False otherwise
    """
    # Regex pattern for MAC address (e.g., 00:1A:2B:3C:4D:5E or 00-1A-2B-3C-4D-5E)
    mac_pattern = r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"

    return bool(re.match(mac_pattern, mac))


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """
    Validate geographic coordinates.

    Args:
        latitude: Latitude (-90 to 90)
        longitude: Longitude (-180 to 180)

    Returns:
        bool: True if valid coordinates, False otherwise
    """
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def clean_input(text: str) -> str:
    """
    Clean and sanitize input text.

    Args:
        text: Text to clean

    Returns:
        str: Cleaned text
    """
    # Remove any HTML tags
    text = re.sub(r"<[^>]*>", "", text)

    # Remove multiple whitespaces
    text = re.sub(r"\s+", " ", text)

    # Trim whitespace
    text = text.strip()

    return text
