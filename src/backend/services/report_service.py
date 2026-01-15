"""Report service for auto-generating visit marks from SOAP records."""

import logging
from collections import defaultdict
from typing import Any, Dict

from services.plan_service import calculate_visit_duration_minutes

logger = logging.getLogger(__name__)


class ReportServiceError(Exception):
    """Exception raised for report service errors."""
    pass


def generate_visit_marks(
    report_id: str,
    user_id: str,
    patient_id: str,
    period_start: str,
    period_end: str,
) -> None:
    """
    Auto-generate visit marks from soap_records for a report period.
    
    Rules:
    - For each visit date:
      - If count >= 2 visits => add DOUBLE_CIRCLE (◎)
      - Else => add CIRCLE (○)
      - If duration < 30 minutes => add CHECK (✔︎)
    - TRIANGLE and SQUARE are manual marks only (not auto-generated)
    
    Args:
        report_id: Report ID
        user_id: User ID
        patient_id: Patient ID
        period_start: Period start date (YYYY-MM-DD)
        period_end: Period end date (YYYY-MM-DD)
    """
    try:
        # Import here to avoid circular dependency
        from services.database_service import get_supabase_client
        supabase = get_supabase_client()
        
        # Fetch soap_records for the period
        soap_response = (
            supabase.table("soap_records")
            .select("*")
            .eq("user_id", user_id)
            .eq("patient_id", patient_id)
            .gte("visit_date", period_start)
            .lte("visit_date", period_end)
            .order("visit_date")
            .execute()
        )
        
        if not soap_response or not hasattr(soap_response, 'data') or not soap_response.data:
            logger.info(f"No SOAP records found for patient {patient_id} in period {period_start} to {period_end}")
            return
        
        # Group visits by date and calculate marks
        visits_by_date = defaultdict(list)
        for record in soap_response.data:
            visit_date = record.get("visit_date")
            if visit_date:
                # Convert date to string if it's a date object
                if not isinstance(visit_date, str):
                    visit_date = str(visit_date)
                visits_by_date[visit_date].append(record)
        
        # Generate marks
        marks_to_insert = []
        
        for visit_date, records in visits_by_date.items():
            visit_count = len(records)
            
            # Determine primary mark (○ or ◎)
            if visit_count >= 2:
                primary_mark = "DOUBLE_CIRCLE"
            else:
                primary_mark = "CIRCLE"
            
            # Add primary mark
            marks_to_insert.append({
                "user_id": user_id,
                "report_id": report_id,
                "visit_date": visit_date,
                "mark": primary_mark,
            })
            
            # Check for short visits (< 30 minutes) and add CHECK mark
            for record in records:
                start_time = record.get("start_time")
                end_time = record.get("end_time")
                
                if start_time and end_time:
                    duration_minutes = calculate_visit_duration_minutes(start_time, end_time)
                    
                    if duration_minutes is not None and duration_minutes < 30:
                        # Add CHECK mark (can coexist with primary mark)
                        marks_to_insert.append({
                            "user_id": user_id,
                            "report_id": report_id,
                            "visit_date": visit_date,
                            "mark": "CHECK",
                        })
                        break  # Only need one CHECK per date
        
        # Delete existing auto-generated marks (CIRCLE, DOUBLE_CIRCLE, CHECK)
        # Keep manual marks (TRIANGLE, SQUARE)
        if marks_to_insert:
            dates_with_marks = {mark["visit_date"] for mark in marks_to_insert}
            
            # Delete auto-generated marks for each date
            # We delete each mark type separately to avoid syntax issues
            for date in dates_with_marks:
                for mark_type in ["CIRCLE", "DOUBLE_CIRCLE", "CHECK"]:
                    try:
                        supabase.table("report_visit_marks").delete().eq(
                            "report_id", report_id
                        ).eq("visit_date", date).eq(
                            "mark", mark_type
                        ).eq("user_id", user_id).execute()
                    except Exception as e:
                        # Log but continue - mark might not exist
                        logger.debug(f"Could not delete mark {mark_type} for date {date}: {e}")
            
            # Insert new marks
            if marks_to_insert:
                try:
                    supabase.table("report_visit_marks").insert(marks_to_insert).execute()
                    logger.info(f"Generated {len(marks_to_insert)} visit marks for report {report_id}")
                except Exception as insert_error:
                    logger.error(f"Failed to insert visit marks: {insert_error}")
                    # Don't raise - marks generation failure shouldn't break report creation
                    raise ReportServiceError(f"Failed to insert visit marks: {str(insert_error)}") from insert_error
        else:
            logger.info(f"No marks to generate for report {report_id}")
            
    except ReportServiceError:
        # Re-raise ReportServiceError as-is
        raise
    except Exception as e:
        logger.error(f"Error generating visit marks: {e}", exc_info=True)
        raise ReportServiceError(f"Failed to generate visit marks: {str(e)}") from e


def regenerate_report_marks(
    report_id: str,
    user_id: str,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Regenerate visit marks for a report.
    
    Args:
        report_id: Report ID
        user_id: User ID
        force: If True, regenerate even if fields are already edited
        
    Returns:
        Updated report dictionary
    """
    try:
        # Import here to avoid circular dependency
        from services.database_service import get_supabase_client, DatabaseServiceError
        
        # Fetch report directly to avoid circular import
        supabase = get_supabase_client()
        report_response = (
            supabase.table("reports")
            .select("*")
            .eq("id", report_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not report_response or not hasattr(report_response, 'data') or not report_response.data:
            raise DatabaseServiceError(f"Report {report_id} not found")
        
        report = report_response.data
        
        # Fetch visit marks
        marks_response = (
            supabase.table("report_visit_marks")
            .select("*")
            .eq("report_id", report_id)
            .eq("user_id", user_id)
            .order("visit_date")
            .execute()
        )
        report["visit_marks"] = (marks_response.data if marks_response and hasattr(marks_response, 'data') and marks_response.data else [])
        
        # Check if report has been edited (if not forcing)
        if not force:
            # Check if any text fields have been filled
            has_content = any([
                report.get("disease_progress_text"),
                report.get("nursing_rehab_text"),
                report.get("family_situation_text"),
                report.get("procedure_text"),
                report.get("monitoring_text"),
            ])
            
            if has_content:
                logger.info(f"Report {report_id} has content, skipping mark regeneration (use force=True to override)")
                return report
        
        # Regenerate marks
        patient_id = report["patient_id"]
        period_start = report["period_start"]
        period_end = report["period_end"]
        
        generate_visit_marks(report_id, user_id, patient_id, period_start, period_end)
        
        # Optionally regenerate draft summaries if force=True
        if force:
            # Regenerate disease_progress_text from last N soap_records
            try:
                # Fetch SOAP records directly to avoid circular import
                soap_response = (
                    supabase.table("soap_records")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("patient_id", patient_id)
                    .gte("visit_date", period_start)
                    .lte("visit_date", period_end)
                    .order("visit_date", desc=True)
                    .limit(10)
                    .execute()
                )
                
                soap_records = (soap_response.data if soap_response and hasattr(soap_response, 'data') and soap_response.data else [])
                
                if soap_records:
                    progress_parts = []
                    for record in reversed(soap_records):  # Oldest first
                        soap_output = record.get("soap_output", {})
                        notes = record.get("notes", "")
                        
                        if isinstance(soap_output, dict):
                            a_section = soap_output.get("A", {})
                            if isinstance(a_section, dict):
                                for key, value in a_section.items():
                                    if isinstance(value, str) and value.strip():
                                        progress_parts.append(value.strip())
                        
                        if notes and notes.strip():
                            progress_parts.append(notes.strip())
                    
                    if progress_parts:
                        progress_text = "\n".join(progress_parts[:20])
                        if len(progress_text) > 2000:
                            progress_text = progress_text[:2000] + "..."
                        
                        # Update report directly
                        supabase.table("reports").update({
                            "disease_progress_text": progress_text
                        }).eq("id", report_id).eq("user_id", user_id).execute()
            except Exception as e:
                logger.warning(f"Failed to regenerate disease_progress_text: {e}")
        
        # Return updated report by fetching it again
        report_response = (
            supabase.table("reports")
            .select("*")
            .eq("id", report_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not report_response or not hasattr(report_response, 'data') or not report_response.data:
            raise DatabaseServiceError(f"Report {report_id} not found")
        
        report = report_response.data
        
        # Fetch visit marks
        marks_response = (
            supabase.table("report_visit_marks")
            .select("*")
            .eq("report_id", report_id)
            .eq("user_id", user_id)
            .order("visit_date")
            .execute()
        )
        report["visit_marks"] = (marks_response.data if marks_response and hasattr(marks_response, 'data') and marks_response.data else [])
        
        return report
        
    except Exception as e:
        if isinstance(e, ReportServiceError):
            raise
        logger.error(f"Error regenerating report marks: {e}")
        raise ReportServiceError(f"Failed to regenerate report marks: {str(e)}") from e
