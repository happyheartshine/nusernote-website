"""Database service for Supabase operations."""

import logging
from typing import Any, Dict, Optional

from supabase import create_client, Client

from config import settings

logger = logging.getLogger(__name__)

# Global Supabase client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    
    Returns:
        Supabase client instance.
        
    Raises:
        ValueError: If Supabase configuration is missing.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.SUPABASE_PROJECT_URL:
            raise ValueError("SUPABASE_PROJECT_URL environment variable is required.")
        if not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
        
        _supabase_client = create_client(
            settings.SUPABASE_PROJECT_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info("Supabase client initialized")
    
    return _supabase_client


class DatabaseServiceError(Exception):
    """Exception raised for database service errors."""
    pass


def save_soap_record(
    user_id: str,
    patient_name: str,
    diagnosis: str,
    visit_date: str,
    start_time: str,
    end_time: str,
    nurses: list[str],
    chief_complaint: str,
    s_text: str,
    o_text: str,
    soap_output: Dict[str, Any],
    plan_output: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Save SOAP record to Supabase database.
    
    Args:
        user_id: Authenticated user ID
        patient_name: Patient name
        diagnosis: Primary diagnosis
        visit_date: Visit date (YYYY-MM-DD format)
        start_time: Start time (HH:MM format)
        end_time: End time (HH:MM format)
        nurses: List of nurse names
        chief_complaint: Chief complaint
        s_text: Subjective text input
        o_text: Objective text input
        soap_output: Parsed SOAP output structure
        plan_output: Parsed Plan output structure
        
    Returns:
        Dictionary containing the inserted record data.
        
    Raises:
        DatabaseServiceError: If save operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        record_data = {
            "user_id": user_id,
            "patient_name": patient_name,
            "diagnosis": diagnosis,
            "visit_date": visit_date,
            "start_time": start_time,
            "end_time": end_time,
            "nurses": nurses,
            "chief_complaint": chief_complaint,
            "s_text": s_text,
            "o_text": o_text,
            "soap_output": soap_output,
            "plan_output": plan_output,
        }
        
        logger.info(f"Saving SOAP record for user {user_id}, patient {patient_name}")
        
        response = supabase.table("soap_records").insert(record_data).execute()
        
        if not response.data:
            raise DatabaseServiceError("Failed to save record: No data returned")
        
        logger.info(f"Successfully saved SOAP record with ID: {response.data[0].get('id')}")
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error saving SOAP record to database: {e}")
        raise DatabaseServiceError(f"Failed to save record: {str(e)}") from e


def get_soap_records(
    user_id: str, 
    limit: int = 100,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    nurse_name: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """
    Fetch SOAP records for a specific user from Supabase database.
    
    Args:
        user_id: Authenticated user ID
        limit: Maximum number of records to return (default: 100)
        date_from: Start date for filtering (YYYY-MM-DD format, inclusive)
        date_to: End date for filtering (YYYY-MM-DD format, inclusive)
        nurse_name: Nurse name for filtering (exact match in nurses array)
        
    Returns:
        List of dictionaries containing SOAP record data, ordered by visit_date DESC.
        
    Raises:
        DatabaseServiceError: If fetch operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching SOAP records for user {user_id} with filters: date_from={date_from}, date_to={date_to}, nurse_name={nurse_name}")
        
        query = (
            supabase.table("soap_records")
            .select("*")
            .eq("user_id", user_id)
        )
        
        # Apply date range filters
        if date_from:
            query = query.gte("visit_date", date_from)
        if date_to:
            query = query.lte("visit_date", date_to)
        
        # Apply nurse filter (check if nurse_name is in the nurses array)
        if nurse_name:
            query = query.contains("nurses", [nurse_name])
        
        response = (
            query
            .order("visit_date", desc=True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        if not response.data:
            logger.info(f"No records found for user {user_id}")
            return []
        
        logger.info(f"Successfully fetched {len(response.data)} records for user {user_id}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching SOAP records from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch records: {str(e)}") from e


def get_soap_record_by_id(record_id: str, user_id: str) -> Dict[str, Any]:
    """
    Fetch a single SOAP record by ID for a specific user from Supabase database.
    
    Args:
        record_id: Record ID (UUID)
        user_id: Authenticated user ID (for security check)
        
    Returns:
        Dictionary containing SOAP record data with full soap_output and plan_output.
        
    Raises:
        DatabaseServiceError: If fetch operation fails or record not found.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching SOAP record {record_id} for user {user_id}")
        
        response = (
            supabase.table("soap_records")
            .select("*")
            .eq("id", record_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Record {record_id} not found")
        
        logger.info(f"Successfully fetched SOAP record {record_id}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching SOAP record from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch record: {str(e)}") from e


def get_visits_by_patient_and_month(
    user_id: str,
    patient_name: str,
    year: int,
    month: int,
) -> list[Dict[str, Any]]:
    """
    Fetch SOAP records for a specific patient in a specific month.
    
    Args:
        user_id: Authenticated user ID
        patient_name: Patient name
        year: Year (YYYY format)
        month: Month (1-12)
        
    Returns:
        List of dictionaries containing SOAP record data for the specified month,
        ordered by visit_date ASC.
        
    Raises:
        DatabaseServiceError: If fetch operation fails.
    """
    try:
        from datetime import datetime
        
        supabase = get_supabase_client()
        
        # Calculate start and end dates for the month
        start_date = datetime(year, month, 1).strftime('%Y-%m-%d')
        # Calculate last day of month
        if month == 12:
            end_date = datetime(year + 1, 1, 1).strftime('%Y-%m-%d')
        else:
            end_date = datetime(year, month + 1, 1).strftime('%Y-%m-%d')
        
        logger.info(f"Fetching visits for patient {patient_name} in {year}-{month:02d}")
        
        response = (
            supabase.table("soap_records")
            .select("*")
            .eq("user_id", user_id)
            .eq("patient_name", patient_name)
            .gte("visit_date", start_date)
            .lt("visit_date", end_date)
            .order("visit_date", desc=False)
            .order("created_at", desc=False)
            .execute()
        )
        
        if not response.data:
            logger.info(f"No visits found for patient {patient_name} in {year}-{month:02d}")
            return []
        
        logger.info(f"Successfully fetched {len(response.data)} visits for patient {patient_name} in {year}-{month:02d}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching visits by patient and month from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch visits: {str(e)}") from e


def update_soap_record(
    record_id: str,
    user_id: str,
    soap_output: Optional[Dict[str, Any]] = None,
    plan_output: Optional[Dict[str, Any]] = None,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update a SOAP record in Supabase database.
    
    Args:
        record_id: Record ID (UUID)
        user_id: Authenticated user ID (for security check)
        soap_output: Updated SOAP output structure (optional)
        plan_output: Updated Plan output structure (optional)
        status: Updated record status (optional, "draft" or "confirmed")
        
    Returns:
        Dictionary containing the updated record data.
        
    Raises:
        DatabaseServiceError: If update operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        # Build update data
        update_data = {}
        if soap_output is not None:
            update_data["soap_output"] = soap_output
        if plan_output is not None:
            update_data["plan_output"] = plan_output
        if status is not None:
            if status not in ["draft", "confirmed"]:
                raise DatabaseServiceError(f"Invalid status: {status}. Must be 'draft' or 'confirmed'.")
            update_data["status"] = status
        
        if not update_data:
            raise DatabaseServiceError("No update data provided")
        
        logger.info(f"Updating SOAP record {record_id} for user {user_id}")
        
        response = (
            supabase.table("soap_records")
            .update(update_data)
            .eq("id", record_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Record {record_id} not found or update failed")
        
        logger.info(f"Successfully updated SOAP record {record_id}")
        return response.data[0]
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error updating SOAP record in database: {e}")
        raise DatabaseServiceError(f"Failed to update record: {str(e)}") from e