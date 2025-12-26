"""Utils package for NurseNote AI backend."""

from datetime import datetime


def convert_date_to_weekday(date_str: str) -> str:
    """
    Convert date string (YYYY-MM-DD) to Japanese weekday format.
    
    Args:
        date_str: Date string in YYYY-MM-DD format
        
    Returns:
        Japanese weekday string (月, 火, 水, 木, 金, 土, 日)
        
    Raises:
        ValueError: If date string format is invalid
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        weekday_map = {
            0: "月",
            1: "火",
            2: "水",
            3: "木",
            4: "金",
            5: "土",
            6: "日",
        }
        return weekday_map[date_obj.weekday()]
    except ValueError as exc:
        raise ValueError(f"Invalid date format: {date_str}. Expected YYYY-MM-DD") from exc


def format_date_with_weekday(date_str: str) -> str:
    """
    Format date string to YYYY/MM/DD（曜） format.
    
    Args:
        date_str: Date string in YYYY-MM-DD format
        
    Returns:
        Formatted date string like "2024/01/15（月）"
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        weekday = convert_date_to_weekday(date_str)
        return f"{date_obj.strftime('%Y/%m/%d')}（{weekday}）"
    except ValueError as exc:
        raise ValueError(f"Invalid date format: {date_str}. Expected YYYY-MM-DD") from exc


def format_time_range(start_time: str, end_time: str) -> str:
    """
    Format time range to HH:MM〜HH:MM format.
    
    Args:
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        
    Returns:
        Formatted time range string like "14:00〜16:00"
    """
    return f"{start_time}〜{end_time}"


def format_nurses_list(nurses: list[str]) -> str:
    """
    Format list of nurse names to Japanese format (A・B・C).
    
    Args:
        nurses: List of nurse names
        
    Returns:
        Formatted string like "山田・佐藤・鈴木"
    """
    if not nurses:
        return ""
    return "・".join(nurses)

