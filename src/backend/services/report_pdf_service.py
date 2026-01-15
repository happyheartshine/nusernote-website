"""Report PDF service using WeasyPrint for 精神科訪問看護報告書 generation."""

import logging
import os
from calendar import monthrange
from datetime import datetime
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from weasyprint import HTML, CSS

logger = logging.getLogger(__name__)

# Initialize Jinja2 environment
_template_env: Optional[Environment] = None

def get_template_env() -> Environment:
    """Get or create Jinja2 template environment."""
    global _template_env
    
    if _template_env is None:
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
        _template_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True,
        )
        logger.info(f"Jinja2 template environment initialized with template dir: {template_dir}")
    
    return _template_env


def get_report_css_path() -> str:
    """
    Get absolute path to Report PDF CSS file.
    
    WeasyPrint requires absolute paths for proper font loading.
    This ensures the CSS file with @font-face definitions is loaded correctly.
    """
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    css_path = os.path.join(template_dir, 'report.css')
    
    if not os.path.exists(css_path):
        logger.warning(f"Report CSS file not found at: {css_path}")
    
    return os.path.abspath(css_path)


def get_font_path() -> str:
    """
    Get absolute path to fonts directory.
    
    Returns the path where IPAexGothic.ttf should be located.
    This is used for verification and logging purposes.
    """
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    font_path = os.path.join(backend_dir, 'fonts', 'IPAexGothic.ttf')
    return os.path.abspath(font_path)


class ReportPDFServiceError(Exception):
    """Exception raised for report PDF service errors."""
    pass


def get_mark_symbol(mark: str) -> str:
    """Convert mark type to Unicode symbol."""
    mark_map = {
        "CIRCLE": "○",
        "TRIANGLE": "△",
        "DOUBLE_CIRCLE": "◎",
        "SQUARE": "□",
        "CHECK": "レ",  # Japanese checkmark as per form specification
    }
    return mark_map.get(mark, "")


def build_calendar_weeks(
    year: int,
    month: int,
    visit_marks: list[Dict[str, Any]],
) -> list[list[Dict[str, Any]]]:
    """
    Build calendar weeks for the given month with visit marks.
    
    Args:
        year: Year (e.g., 2026)
        month: Month (1-12)
        visit_marks: List of visit mark dictionaries with visit_date and mark
        
    Returns:
        List of weeks, where each week is a list of day dictionaries
        Each day dict has: {'date': int or None, 'marks': str}
    """
    # Create a dictionary of marks by date
    marks_by_date = {}
    for mark in visit_marks:
        visit_date = mark.get("visit_date")
        if visit_date:
            try:
                # Parse date string (YYYY-MM-DD)
                date_obj = datetime.strptime(str(visit_date), "%Y-%m-%d")
                if date_obj.year == year and date_obj.month == month:
                    date_key = date_obj.day
                    if date_key not in marks_by_date:
                        marks_by_date[date_key] = []
                    marks_by_date[date_key].append(mark.get("mark", ""))
            except (ValueError, TypeError):
                continue
    
    # Get first day of week and number of days in month
    first_day, num_days = monthrange(year, month)
    
    # Build calendar weeks
    weeks = []
    current_day = 1
    week = []
    
    # Fill empty cells before first day
    for _ in range(first_day):
        week.append({'date': None, 'marks': ''})
    
    # Fill days of the month
    while current_day <= num_days:
        if len(week) == 7:
            weeks.append(week)
            week = []
        
        # Get marks for this day
        marks_for_day = marks_by_date.get(current_day, [])
        marks_str = "".join([get_mark_symbol(m) for m in marks_for_day])
        
        week.append({'date': current_day, 'marks': marks_str})
        current_day += 1
    
    # Fill empty cells after last day
    while len(week) < 7:
        week.append({'date': None, 'marks': ''})
    
    if week:
        weeks.append(week)
    
    return weeks


def map_report_to_template(
    report_data: Dict[str, Any],
    patient_data: Dict[str, Any],
    org_settings: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Map report data to template format.
    
    Args:
        report_data: Report dictionary from database (with visit_marks)
        patient_data: Patient dictionary from database
        org_settings: Optional organization settings dictionary
        
    Returns:
        Dictionary with mapped data for report template
    """
    # Extract patient information
    patient_name = patient_data.get("name", "")
    
    # Convert gender to Japanese
    gender = patient_data.get("gender", "")
    if gender == "male":
        patient_gender = "男"
    elif gender == "female":
        patient_gender = "女"
    else:
        patient_gender = gender  # Keep as-is if already Japanese or empty
    
    patient_address = patient_data.get("address", "")
    patient_contact = patient_data.get("contact", "")
    
    # Format birth date
    patient_birth_date = ""
    if patient_data.get("birth_date"):
        try:
            birth_date = datetime.fromisoformat(patient_data["birth_date"].replace("Z", "+00:00"))
            patient_birth_date = f"{birth_date.year}年{birth_date.month}月{birth_date.day}日"
        except (ValueError, AttributeError):
            try:
                birth_date = datetime.strptime(patient_data["birth_date"], "%Y-%m-%d")
                patient_birth_date = f"{birth_date.year}年{birth_date.month}月{birth_date.day}日"
            except (ValueError, AttributeError):
                # Try using year/month/day fields
                if patient_data.get("birth_date_year"):
                    year = patient_data.get("birth_date_year", "")
                    month = patient_data.get("birth_date_month", "")
                    day = patient_data.get("birth_date_day", "")
                    patient_birth_date = f"{year}年{month}月{day}日" if year else ""
    
    # Extract report period
    year_month = report_data.get("year_month", "")
    period_start = report_data.get("period_start", "")
    period_end = report_data.get("period_end", "")
    visit_marks = report_data.get("visit_marks", [])
    
    # Determine months for calendar
    calendar_month1_label = ""
    calendar_month2_label = ""
    calendar_month1_weeks = []
    calendar_month2_weeks = []
    
    if year_month:
        try:
            year, month = map(int, year_month.split("-"))
            calendar_month1_label = f"{year}年{month}月"
            calendar_month1_weeks = build_calendar_weeks(year, month, visit_marks)
            
            # Always show two months side by side
            # Check if period spans two months
            if period_start and period_end:
                try:
                    start_date = datetime.strptime(period_start, "%Y-%m-%d")
                    end_date = datetime.strptime(period_end, "%Y-%m-%d")
                    
                    # If period spans two months, show both
                    if start_date.month != end_date.month:
                        calendar_month2_label = f"{end_date.year}年{end_date.month}月"
                        calendar_month2_weeks = build_calendar_weeks(end_date.year, end_date.month, visit_marks)
                    else:
                        # Show next month if only one month
                        next_month = month + 1
                        next_year = year
                        if next_month > 12:
                            next_month = 1
                            next_year += 1
                        calendar_month2_label = f"{next_year}年{next_month}月"
                        calendar_month2_weeks = build_calendar_weeks(next_year, next_month, visit_marks)
                except (ValueError, TypeError):
                    # Fallback: show next month
                    next_month = month + 1
                    next_year = year
                    if next_month > 12:
                        next_month = 1
                        next_year += 1
                    calendar_month2_label = f"{next_year}年{next_month}月"
                    calendar_month2_weeks = build_calendar_weeks(next_year, next_month, visit_marks)
            else:
                # No period dates, show next month
                next_month = month + 1
                next_year = year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                calendar_month2_label = f"{next_year}年{next_month}月"
                calendar_month2_weeks = build_calendar_weeks(next_year, next_month, visit_marks)
        except (ValueError, IndexError):
            pass
    
    # Format GAF date
    gaf_date = report_data.get("gaf_date")
    if gaf_date:
        try:
            date_obj = datetime.strptime(str(gaf_date), "%Y-%m-%d")
            gaf_date = date_obj.strftime("%Y年%m月%d日")
        except (ValueError, TypeError):
            pass
    
    # Format report date
    report_date = report_data.get("report_date")
    if report_date:
        try:
            date_obj = datetime.strptime(str(report_date), "%Y-%m-%d")
            report_date = date_obj.strftime("%Y年%m月%d日")
        except (ValueError, TypeError):
            pass
    
    return {
        "patient_name": patient_name,
        "patient_gender": patient_gender,
        "patient_birth_date": patient_birth_date,
        "patient_address": patient_address,
        "patient_contact": patient_contact,
        "long_term_care_status": "",  # Can be added to patient_data if needed
        "calendar_month1_label": calendar_month1_label,
        "calendar_month1_weeks": calendar_month1_weeks,
        "calendar_month2_label": calendar_month2_label,
        "calendar_month2_weeks": calendar_month2_weeks,
        "disease_progress_text": report_data.get("disease_progress_text", ""),
        "nursing_rehab_text": report_data.get("nursing_rehab_text", ""),
        "family_situation_text": report_data.get("family_situation_text", ""),
        "procedure_text": report_data.get("procedure_text", ""),
        "monitoring_text": report_data.get("monitoring_text", ""),
        "gaf_score": report_data.get("gaf_score"),
        "gaf_date": gaf_date,
        "profession_text": report_data.get("profession_text", "訪問した職種：看護師"),
        "report_date": report_date,
        "org_station_name": org_settings.get("station_name", "") if org_settings else "",
        "org_admin_name": org_settings.get("admin_name", "") if org_settings else "",
    }


def generate_report_pdf(
    report_data: Dict[str, Any],
    patient_data: Dict[str, Any],
    org_settings: Optional[Dict[str, Any]] = None,
) -> bytes:
    """
    Generate report PDF (精神科訪問看護報告書) using WeasyPrint.
    
    Args:
        report_data: Report dictionary from database (with visit_marks)
        patient_data: Patient dictionary from database
        org_settings: Optional organization settings dictionary
        
    Returns:
        PDF file content as bytes
        
    Raises:
        ReportPDFServiceError: If PDF generation fails
    """
    try:
        # Verify font file exists (log warning if missing)
        font_path = get_font_path()
        if not os.path.exists(font_path):
            logger.warning(
                f"Japanese font not found at: {font_path}\n"
                f"Japanese text will render as boxes (■■■) in the PDF.\n"
                f"Please download IPAexGothic.ttf and place it in the fonts directory."
            )
        else:
            logger.info(f"Japanese font verified at: {font_path}")
        
        template_env = get_template_env()
        
        # Map report data to PDF template format
        template_data = map_report_to_template(report_data, patient_data, org_settings)
        
        # Render HTML template
        try:
            template = template_env.get_template('report.html')
            html_content = template.render(**template_data)
        except TemplateNotFound:
            raise ReportPDFServiceError("Report template not found: report.html")
        
        # Get CSS file path for WeasyPrint
        css_path = get_report_css_path()
        
        # Inject font path into CSS
        css_content = ""
        try:
            with open(css_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            # Replace placeholder font path with actual path
            css_content = css_content.replace(
                "url('file:///app/fonts/IPAexGothic.ttf')",
                f"url('file:///{font_path.replace(os.sep, '/')}')"
            )
        except Exception as e:
            logger.warning(f"Could not read CSS file, using default: {e}")
            css_content = None
        
        # Convert HTML to PDF using WeasyPrint with embedded fonts
        logger.info("Converting HTML to PDF using WeasyPrint with Japanese font embedding")
        
        # Create HTML object from string
        html_obj = HTML(string=html_content)
        
        # Create CSS object
        if css_content:
            css_obj = CSS(string=css_content)
        else:
            css_obj = CSS(filename=css_path)
        
        # Generate PDF
        pdf_bytes = html_obj.write_pdf(stylesheets=[css_obj])
        
        logger.info(f"Successfully generated report PDF ({len(pdf_bytes)} bytes)")
        return pdf_bytes
        
    except ReportPDFServiceError:
        raise
    except Exception as e:
        logger.error(f"Error generating report PDF: {e}", exc_info=True)
        raise ReportPDFServiceError(f"Failed to generate report PDF: {str(e)}") from e
