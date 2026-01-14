"""PDF generation service for medical reports."""

import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from weasyprint import HTML, CSS

from config import settings

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


def get_css_path() -> str:
    """
    Get absolute path to PDF CSS file.
    
    WeasyPrint requires absolute paths for proper font loading.
    This ensures the CSS file with @font-face definitions is loaded correctly.
    """
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    css_path = os.path.join(template_dir, 'pdf.css')
    
    if not os.path.exists(css_path):
        logger.warning(f"PDF CSS file not found at: {css_path}")
    
    return os.path.abspath(css_path)


def get_plan_css_path() -> str:
    """
    Get absolute path to Plan PDF CSS file.
    
    WeasyPrint requires absolute paths for proper font loading.
    This ensures the CSS file with @font-face definitions is loaded correctly.
    """
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
    css_path = os.path.join(template_dir, 'plan.css')
    
    if not os.path.exists(css_path):
        logger.warning(f"Plan CSS file not found at: {css_path}")
    
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


class PDFServiceError(Exception):
    """Exception raised for PDF service errors."""
    pass


def map_soap_to_visit_report(record_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map SOAP record data to visit report format (精神科訪問看護記録書Ⅱ).
    
    This function intelligently maps SOAP components to the official Japanese medical form sections,
    following the exact mapping rules specified for the official form.
    
    Mapping Rules:
    - 食生活・清潔・排泄・睡眠・生活リズム・整頓: Extract from O (objective) + S if relevant to daily living
    - 精神状態: A（症状推移 + 背景要因 + リスク評価を要約）
    - 服薬等の状況: A（服薬アドヒアランス・怠薬・副作用）
    - 作業・対人関係: O + S から対人・活動に関する記述
    - 実施した看護内容: P【本日実施した援助】
    - 備考: Optional free text or empty
    - GAF: soap_record.gaf (if none, leave blank)
    
    Args:
        record_data: Full SOAP record dictionary from database
        
    Returns:
        Dictionary with mapped data for visit report template
    """
    soap_output = record_data.get('soap_output', {})
    plan_output = record_data.get('plan_output', {})
    
    # Extract SOAP components
    s = soap_output.get('s', '')
    o = soap_output.get('o', '')
    a = soap_output.get('a', {})
    p = soap_output.get('p', {})
    
    # Map A (Assessment) components
    symptom_progression = a.get('症状推移', '')
    background_factors = a.get('背景要因', '')
    risk_assessment = a.get('リスク評価', '')
    
    # Map P (Plan) components
    interventions_today = p.get('本日実施した援助', '')
    next_visit_plan = p.get('次回以降の方針', '')
    
    # Parse visit date
    visit_date_str = record_data.get('visit_date', '')
    visit_date = None
    year = ''
    month = ''
    day = ''
    if visit_date_str:
        try:
            visit_date = datetime.strptime(visit_date_str, '%Y-%m-%d')
            year = str(visit_date.year)
            month = str(visit_date.month)
            day = str(visit_date.day)
        except ValueError:
            pass
    
    # Format visit time (separate start and end)
    start_time = record_data.get('start_time', '') or ''
    end_time = record_data.get('end_time', '') or ''
    start_hour = ''
    start_minute = ''
    end_hour = ''
    end_minute = ''
    if start_time:
        # Parse HH:MM:SS or HH:MM format
        time_parts = start_time.split(':')
        if len(time_parts) >= 2:
            start_hour = time_parts[0]
            start_minute = time_parts[1]
    if end_time:
        time_parts = end_time.split(':')
        if len(time_parts) >= 2:
            end_hour = time_parts[0]
            end_minute = time_parts[1]
    
    # Extract nurse names
    nurses = record_data.get('nurses', [])
    nurse_names = ', '.join(nurses) if nurses else ''
    
    # Determine visit type (職種) - default to 看護師 if not specified
    # In production, this could be derived from nurse roles or database field
    visit_type = '看護師'  # Default: 保健師・看護師・准看護師・作業療法士
    
    # Visit location (訪問先)
    visit_location = ''  # Not currently in schema, leave blank
    
    # ============================================
    # SECTION MAPPING (Following official form requirements)
    # ============================================
    
    # 1. 食生活・清潔・排泄・睡眠・生活リズム・部屋の整頓等
    # Extract from O (objective) + S if relevant to daily living
    daily_living = ''
    daily_living_parts = []
    # Combine O and S, focusing on daily living aspects
    combined_so = f"{o}\n{s}".strip()
    if combined_so:
        daily_living = combined_so  # In production, could use AI to extract specific daily living info
    
    # 2. 精神状態
    # A（症状推移 + 背景要因 + リスク評価を要約）
    mental_state = ''
    mental_state_parts = []
    if symptom_progression:
        mental_state_parts.append(symptom_progression)
    if background_factors:
        mental_state_parts.append(background_factors)
    if risk_assessment:
        mental_state_parts.append(risk_assessment)
    mental_state = '\n'.join(mental_state_parts) if mental_state_parts else ''
    
    # 3. 服薬等の状況
    # A（服薬アドヒアランス・怠薬・副作用）
    medication_status = ''
    # Extract medication-related info from risk assessment
    # Look for keywords related to medication
    if risk_assessment:
        # Check if risk assessment contains medication-related content
        medication_keywords = ['服薬', '薬', 'アドヒアランス', '怠薬', '副作用', '内服']
        if any(keyword in risk_assessment for keyword in medication_keywords):
            medication_status = risk_assessment
        else:
            # Also check in symptom progression
            if any(keyword in symptom_progression for keyword in medication_keywords):
                medication_status = symptom_progression
    
    # 4. 作業・対人関係について
    # O + S から対人・活動に関する記述
    work_interpersonal = ''
    # Extract work/interpersonal information from O and S
    combined_so_for_interpersonal = f"{o}\n{s}".strip()
    if combined_so_for_interpersonal:
        # Look for keywords related to work/interpersonal
        interpersonal_keywords = ['作業', '対人', '関係', '活動', '交流', 'コミュニケーション', '職場', '友人']
        if any(keyword in combined_so_for_interpersonal for keyword in interpersonal_keywords):
            work_interpersonal = combined_so_for_interpersonal
        else:
            # If no specific keywords, use O as it often contains objective observations
            work_interpersonal = o if o else ''
    
    # 5. 実施した看護内容
    # P【本日実施した援助】
    nursing_interventions = interventions_today
    
    # 6. 備考 (optional)
    remarks = ''
    
    # 7. GAF (optional)
    gaf_score = record_data.get('gaf', '') or ''
    
    # 8. Next visit date (次回の訪問予定日)
    next_visit_year = ''
    next_visit_month = ''
    next_visit_day = ''
    # Could parse next_visit_plan for date information
    # For now, leave blank as it's not in the current schema
    
    # Next visit time (次回訪問時間)
    next_visit_start_hour = ''
    next_visit_start_minute = ''
    next_visit_end_hour = ''
    next_visit_end_minute = ''
    
    return {
        # Header information
        'patient_name': record_data.get('patient_name', ''),
        'visit_year': year,
        'visit_month': month,
        'visit_day': day,
        'start_hour': start_hour,
        'start_minute': start_minute,
        'end_hour': end_hour,
        'end_minute': end_minute,
        'nurse_names': nurse_names,
        'visit_type': visit_type,
        'visit_location': visit_location,
        'diagnosis': record_data.get('diagnosis', ''),
        
        # Main sections
        'daily_living': daily_living,
        'mental_state': mental_state,
        'medication_status': medication_status,
        'work_interpersonal': work_interpersonal,
        'nursing_interventions': nursing_interventions,
        'remarks': remarks,
        'gaf_score': gaf_score,
        
        # Footer (next visit)
        'next_visit_year': next_visit_year,
        'next_visit_month': next_visit_month,
        'next_visit_day': next_visit_day,
        'next_visit_start_hour': next_visit_start_hour,
        'next_visit_start_minute': next_visit_start_minute,
        'next_visit_end_hour': next_visit_end_hour,
        'next_visit_end_minute': next_visit_end_minute,
    }


def generate_visit_report_pdf(record_data: Dict[str, Any]) -> bytes:
    """
    Generate visit report PDF (精神科訪問看護記録書Ⅱ).
    
    This function uses WeasyPrint with embedded Japanese fonts to ensure
    proper rendering of Japanese medical text in the PDF.
    
    Args:
        record_data: Full SOAP record dictionary from database
        
    Returns:
        PDF file content as bytes with embedded Japanese fonts
        
    Raises:
        PDFServiceError: If PDF generation fails
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
        
        # Map SOAP data to visit report format
        template_data = map_soap_to_visit_report(record_data)
        
        # Render HTML template
        try:
            template = template_env.get_template('visit_report.html')
            html_content = template.render(**template_data)
        except TemplateNotFound:
            raise PDFServiceError("Visit report template not found: visit_report.html")
        
        # Get CSS file path for visit report and read it
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
        css_path = os.path.join(template_dir, 'pdf_report.css')
        css_path = os.path.abspath(css_path)
        
        # Read CSS and inject font path dynamically
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # Replace font path placeholder with actual absolute path
        # Convert Windows path to file:// URL format for WeasyPrint
        if os.name == 'nt':  # Windows
            # Convert C:\path\to\font.ttf to file:///C:/path/to/font.ttf
            font_url = font_path.replace('\\', '/')
            if not font_url.startswith('/'):
                font_url = '/' + font_url
            font_url = 'file://' + font_url
        else:  # Unix/Linux/Mac
            font_url = 'file://' + font_path
        
        # Replace placeholder in CSS (if exists) or inject font-face rule
        if '@font-face' in css_content and 'IPAexGothic.ttf' in css_content:
            # Replace the font path in existing @font-face
            css_content = re.sub(
                r"url\('file://[^']+IPAexGothic\.ttf'\)",
                f"url('{font_url}')",
                css_content
            )
        else:
            # Inject @font-face if not present
            font_face_rule = f"""
@font-face {{
    font-family: 'IPAexGothic';
    src: url('{font_url}') format('truetype');
    font-weight: normal;
    font-style: normal;
}}
"""
            css_content = font_face_rule + css_content
        
        # Convert HTML to PDF using WeasyPrint with embedded fonts
        logger.info("Converting HTML to PDF using WeasyPrint with Japanese font embedding")
        
        # Create HTML object from string
        html_obj = HTML(string=html_content)
        
        # Generate PDF with CSS (contains @font-face for Japanese fonts)
        # Use CSS(string=...) with dynamically generated CSS content
        pdf_bytes = html_obj.write_pdf(
            stylesheets=[CSS(string=css_content)]
        )
        
        logger.info(f"Successfully generated visit report PDF ({len(pdf_bytes)} bytes)")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error generating visit report PDF: {e}")
        raise PDFServiceError(f"Failed to generate visit report PDF: {str(e)}") from e


def generate_monthly_report_pdf(patient_id: str, patient_name: str, month: str, year: str, visits_data: list[Dict[str, Any]]) -> bytes:
    """
    Generate monthly report PDF.
    
    This function uses WeasyPrint with embedded Japanese fonts to ensure
    proper rendering of Japanese medical text in the PDF.
    
    Args:
        patient_id: Patient ID
        patient_name: Patient name
        month: Month (MM format)
        year: Year (YYYY format)
        visits_data: List of visit records for the month
        
    Returns:
        PDF file content as bytes with embedded Japanese fonts
        
    Raises:
        PDFServiceError: If PDF generation fails
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
        
        # Aggregate visit data for monthly report
        num_visits = len(visits_data)
        
        # Extract AI-generated summaries from visits
        # This would ideally use AI to generate summaries, but for now we aggregate from SOAP data
        symptom_progression_summary = ''
        sleep_life_rhythm_summary = ''
        anxiety_positive_negative_summary = ''
        medication_stability_summary = ''
        family_environment_summary = ''
        overall_assessment = ''
        next_month_plan = ''
        
        # Aggregate data from all visits
        all_symptoms = []
        all_medications = []
        all_interventions = []
        
        for visit in visits_data:
            soap_output = visit.get('soap_output', {})
            a = soap_output.get('a', {})
            p = soap_output.get('p', {})
            
            if a.get('症状推移'):
                all_symptoms.append(a['症状推移'])
            if a.get('リスク評価'):
                all_medications.append(a['リスク評価'])
            if p.get('本日実施した援助'):
                all_interventions.append(p['本日実施した援助'])
        
        # Generate summaries (simplified - in production, use AI)
        if all_symptoms:
            symptom_progression_summary = '\n'.join(all_symptoms[:3])  # Limit to first 3
        if all_medications:
            medication_stability_summary = '\n'.join(all_medications[:3])
        
        # Overall assessment (simplified)
        if visits_data:
            latest_visit = visits_data[-1]
            latest_a = latest_visit.get('soap_output', {}).get('a', {})
            overall_assessment = latest_a.get('リスク評価', '')
        
        # Next month plan (from latest visit)
        if visits_data:
            latest_visit = visits_data[-1]
            latest_p = latest_visit.get('soap_output', {}).get('p', {})
            next_month_plan = latest_p.get('次回以降の方針', '')
        
        # Format created_at timestamp
        created_at_str = datetime.now().strftime('%Y年%m月%d日 %H:%M')
        
        template_data = {
            'patient_name': patient_name,
            'report_month': f"{year}年{month}月",
            'num_visits': num_visits,
            'symptom_progression': symptom_progression_summary,
            'sleep_life_rhythm': sleep_life_rhythm_summary,
            'anxiety_positive_negative': anxiety_positive_negative_summary,
            'medication_stability': medication_stability_summary,
            'family_environment': family_environment_summary,
            'overall_assessment': overall_assessment,
            'next_month_plan': next_month_plan,
            'created_at': created_at_str,
        }
        
        # Render HTML template
        try:
            template = template_env.get_template('monthly_report.html')
            html_content = template.render(**template_data)
        except TemplateNotFound:
            raise PDFServiceError("Monthly report template not found: monthly_report.html")
        
        # Get CSS file path for WeasyPrint
        css_path = get_css_path()
        
        # Convert HTML to PDF using WeasyPrint with embedded fonts
        logger.info("Converting HTML to PDF using WeasyPrint with Japanese font embedding")
        
        # Create HTML object from string
        html_obj = HTML(string=html_content)
        
        # Generate PDF with external CSS (contains @font-face for Japanese fonts)
        pdf_bytes = html_obj.write_pdf(
            stylesheets=[CSS(filename=css_path)]
        )
        
        logger.info(f"Successfully generated monthly report PDF ({len(pdf_bytes)} bytes)")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error generating monthly report PDF: {e}")
        raise PDFServiceError(f"Failed to generate monthly report PDF: {str(e)}") from e


def map_patient_to_visit_record(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map patient data to visit record format (精神科訪問看護記録書Ⅰ).
    
    This function maps patient database fields to the visit_record.html template format.
    
    Args:
        patient_data: Patient dictionary from database
        
    Returns:
        Dictionary with mapped data for visit_record template
    """
    from datetime import datetime
    
    # Parse birth date if available
    birth_year = None
    birth_month = None
    birth_day = None
    if patient_data.get('birth_date'):
        try:
            birth_date = datetime.fromisoformat(patient_data['birth_date'].replace('Z', '+00:00'))
            birth_year = birth_date.year
            birth_month = birth_date.month
            birth_day = birth_date.day
        except (ValueError, AttributeError):
            # Try parsing as string if it's not ISO format
            try:
                birth_date = datetime.strptime(patient_data['birth_date'], '%Y-%m-%d')
                birth_year = birth_date.year
                birth_month = birth_date.month
                birth_day = birth_date.day
            except (ValueError, AttributeError):
                pass
    
    # Parse initial visit date if available
    initial_visit_year = None
    initial_visit_month = None
    initial_visit_day = None
    initial_visit_day_of_week = None
    if patient_data.get('initial_visit_date'):
        try:
            visit_date = datetime.fromisoformat(patient_data['initial_visit_date'].replace('Z', '+00:00'))
            initial_visit_year = visit_date.year
            initial_visit_month = visit_date.month
            initial_visit_day = visit_date.day
            # Get day of week in Japanese
            days = ['月', '火', '水', '木', '金', '土', '日']
            initial_visit_day_of_week = days[visit_date.weekday()]
        except (ValueError, AttributeError):
            try:
                visit_date = datetime.strptime(patient_data['initial_visit_date'], '%Y-%m-%d')
                initial_visit_year = visit_date.year
                initial_visit_month = visit_date.month
                initial_visit_day = visit_date.day
                days = ['月', '火', '水', '木', '金', '土', '日']
                initial_visit_day_of_week = days[visit_date.weekday()]
            except (ValueError, AttributeError):
                pass
    
    # Map gender
    gender = patient_data.get('gender', '')
    if gender == 'male':
        gender = '男'
    elif gender == 'female':
        gender = '女'
    
    return {
        'patient_name': patient_data.get('name', ''),
        'gender': gender,
        'birth_year': birth_year,
        'birth_month': birth_month,
        'birth_day': birth_day,
        'age': patient_data.get('age'),
        'patient_address': patient_data.get('address', ''),
        'patient_contact': patient_data.get('contact', ''),
        'key_person_name': patient_data.get('key_person_name', ''),
        'key_person_relationship': patient_data.get('key_person_relationship', ''),
        'key_person_address': patient_data.get('key_person_address', ''),
        'key_person_contact1': patient_data.get('key_person_contact1', ''),
        'key_person_contact2': patient_data.get('key_person_contact2', ''),
        'initial_visit_year': initial_visit_year,
        'initial_visit_month': initial_visit_month,
        'initial_visit_day': initial_visit_day,
        'initial_visit_day_of_week': initial_visit_day_of_week,
        'initial_visit_start_hour': patient_data.get('initial_visit_start_hour'),
        'initial_visit_start_minute': patient_data.get('initial_visit_start_minute'),
        'initial_visit_end_hour': patient_data.get('initial_visit_end_hour'),
        'initial_visit_end_minute': patient_data.get('initial_visit_end_minute'),
        'main_disease': patient_data.get('primary_diagnosis', ''),
        'medical_history': patient_data.get('medical_history', ''),
        'current_illness_history': patient_data.get('current_illness_history', ''),
        'family_structure': patient_data.get('family_structure', ''),
        'daily_life_meal_nutrition': patient_data.get('daily_life_meal_nutrition', ''),
        'daily_life_hygiene': patient_data.get('daily_life_hygiene', ''),
        'daily_life_medication': patient_data.get('daily_life_medication', ''),
        'daily_life_sleep': patient_data.get('daily_life_sleep', ''),
        'daily_life_living_environment': patient_data.get('daily_life_living_environment', ''),
        'daily_life_family_environment': patient_data.get('daily_life_family_environment', ''),
        'doctor_name': patient_data.get('doctor_name', ''),
        'hospital_name': patient_data.get('hospital_name', ''),
        'hospital_address': patient_data.get('hospital_address', ''),
        'hospital_phone': patient_data.get('hospital_phone', ''),
        'notes': patient_data.get('individual_notes', ''),
        'recorder_name': patient_data.get('recorder_name', ''),
    }


def generate_patient_record_pdf(patient_data: Dict[str, Any]) -> bytes:
    """
    Generate patient record PDF (精神科訪問看護記録書Ⅰ).
    
    This function uses WeasyPrint with embedded Japanese fonts to ensure
    proper rendering of Japanese medical text in the PDF.
    
    Args:
        patient_data: Patient dictionary from database
        
    Returns:
        PDF file content as bytes with embedded Japanese fonts
        
    Raises:
        PDFServiceError: If PDF generation fails
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
        
        # Map patient data to visit record format
        template_data = map_patient_to_visit_record(patient_data)
        
        # Render HTML template
        try:
            template = template_env.get_template('visit_record.html')
            html_content = template.render(**template_data)
        except TemplateNotFound:
            raise PDFServiceError("Visit record template not found: visit_record.html")
        
        # Get CSS file path for visit record (pdf.css)
        css_path = get_css_path()
        
        # Convert HTML to PDF using WeasyPrint with embedded fonts
        logger.info("Converting HTML to PDF using WeasyPrint with Japanese font embedding")
        
        # Create HTML object from string
        html_obj = HTML(string=html_content)
        
        # Generate PDF with external CSS (contains @font-face for Japanese fonts)
        pdf_bytes = html_obj.write_pdf(
            stylesheets=[CSS(filename=css_path)]
        )
        
        logger.info(f"Successfully generated patient record PDF ({len(pdf_bytes)} bytes)")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error generating patient record PDF: {e}")
        raise PDFServiceError(f"Failed to generate patient record PDF: {str(e)}") from e


def map_plan_to_pdf_template(plan_data: Dict[str, Any], patient_data: Dict[str, Any], org_settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Map plan data to PDF template format (精神科訪問看護計画書).
    
    This function maps plan database fields to the plan.html template format.
    
    Args:
        plan_data: Plan dictionary from database
        patient_data: Patient dictionary from database
        org_settings: Optional organization settings dictionary
        
    Returns:
        Dictionary with mapped data for plan template
    """
    from datetime import datetime
    
    # Parse patient birth date
    patient_birth_date = ''
    if patient_data.get('birth_date'):
        try:
            birth_date = datetime.fromisoformat(patient_data['birth_date'].replace('Z', '+00:00'))
            patient_birth_date = f"{birth_date.year}年{birth_date.month}月{birth_date.day}日"
        except (ValueError, AttributeError):
            try:
                birth_date = datetime.strptime(patient_data['birth_date'], '%Y-%m-%d')
                patient_birth_date = f"{birth_date.year}年{birth_date.month}月{birth_date.day}日"
            except (ValueError, AttributeError):
                # Try using year/month/day fields
                if patient_data.get('birth_date_year'):
                    year = patient_data.get('birth_date_year', '')
                    month = patient_data.get('birth_date_month', '')
                    day = patient_data.get('birth_date_day', '')
                    patient_birth_date = f"{year}年{month}月{day}日" if year else ''
    
    # Map gender
    gender = patient_data.get('gender', '')
    if gender == 'male':
        gender = '男'
    elif gender == 'female':
        gender = '女'
    
    # Format plan dates
    start_date = plan_data.get('start_date', '')
    end_date = plan_data.get('end_date', '')
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            start_date = f"{start_dt.year}年{start_dt.month}月{start_dt.day}日"
        except ValueError:
            pass
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_date = f"{end_dt.year}年{end_dt.month}月{end_dt.day}日"
        except ValueError:
            pass
    
    # Format evaluation dates
    evaluations = plan_data.get('evaluations', [])
    formatted_evaluations = []
    for eval_item in evaluations:
        eval_date = eval_item.get('evaluation_date', '')
        if eval_date:
            try:
                eval_dt = datetime.strptime(eval_date, '%Y-%m-%d')
                eval_date = f"{eval_dt.year}年{eval_dt.month}月{eval_dt.day}日"
            except ValueError:
                pass
        
        formatted_evaluations.append({
            'evaluation_date': eval_date,
            'result': eval_item.get('result', 'NONE'),
            'note': eval_item.get('note'),
        })
    
    # Organization settings
    org_station_name = None
    org_station_address = None
    org_planner_name = None
    org_profession_text = '訪問する職種：看護師・准看護師'
    
    if org_settings:
        org_station_name = org_settings.get('station_name')
        org_station_address = org_settings.get('station_address')
        org_planner_name = org_settings.get('planner_name')
        org_profession_text = org_settings.get('profession_text', org_profession_text)
    
    return {
        'title': plan_data.get('title', '精神科訪問看護計画書'),
        'patient_name': patient_data.get('name', ''),
        'patient_gender': gender,
        'patient_birth_date': patient_birth_date,
        'patient_address': patient_data.get('address', ''),
        'patient_contact': patient_data.get('contact', ''),
        'patient_diagnosis': patient_data.get('primary_diagnosis', ''),
        'patient_care_level': '',  # Not in current schema, leave blank
        'start_date': start_date,
        'end_date': end_date,
        'long_term_goal': plan_data.get('long_term_goal', ''),
        'short_term_goal': plan_data.get('short_term_goal'),
        'nursing_policy': plan_data.get('nursing_policy'),
        'patient_family_wish': plan_data.get('patient_family_wish'),
        'has_procedure': plan_data.get('has_procedure', False),
        'procedure_content': plan_data.get('procedure_content'),
        'material_details': plan_data.get('material_details'),
        'material_amount': plan_data.get('material_amount'),
        'procedure_note': plan_data.get('procedure_note'),
        'items': plan_data.get('items', []),
        'evaluations': formatted_evaluations,
        'org_station_name': org_station_name,
        'org_station_address': org_station_address,
        'org_planner_name': org_planner_name,
        'org_profession_text': org_profession_text,
    }


def generate_plan_pdf(plan_data: Dict[str, Any], patient_data: Dict[str, Any], org_settings: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generate plan PDF (精神科訪問看護計画書).
    
    This function uses WeasyPrint with embedded Japanese fonts to ensure
    proper rendering of Japanese medical text in the PDF.
    
    Args:
        plan_data: Plan dictionary from database (with items and evaluations)
        patient_data: Patient dictionary from database
        org_settings: Optional organization settings dictionary
        
    Returns:
        PDF file content as bytes with embedded Japanese fonts
        
    Raises:
        PDFServiceError: If PDF generation fails
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
        
        # Map plan data to PDF template format
        template_data = map_plan_to_pdf_template(plan_data, patient_data, org_settings)
        
        # Render HTML template
        try:
            template = template_env.get_template('plan.html')
            html_content = template.render(**template_data)
        except TemplateNotFound:
            raise PDFServiceError("Plan template not found: plan.html")
        
        # Get CSS file path for WeasyPrint (use plan.css for plan PDFs)
        css_path = get_plan_css_path()
        
        # Convert HTML to PDF using WeasyPrint with embedded fonts
        logger.info("Converting HTML to PDF using WeasyPrint with Japanese font embedding")
        
        # Create HTML object from string
        html_obj = HTML(string=html_content)
        
        # Generate PDF with external CSS (contains @font-face for Japanese fonts)
        pdf_bytes = html_obj.write_pdf(
            stylesheets=[CSS(filename=css_path)]
        )
        
        logger.info(f"Successfully generated plan PDF ({len(pdf_bytes)} bytes)")
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error generating plan PDF: {e}")
        raise PDFServiceError(f"Failed to generate plan PDF: {str(e)}") from e


