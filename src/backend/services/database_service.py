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


# ============================================================================
# Patient CRUD Operations
# ============================================================================

def create_patient(
    user_id: str,
    name: str,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    primary_diagnosis: Optional[str] = None,
    individual_notes: Optional[str] = None,
    status: str = "active",
) -> Dict[str, Any]:
    """
    Create a new patient record.
    
    Args:
        user_id: Authenticated user ID
        name: Patient name
        age: Patient age (optional)
        gender: Patient gender (optional)
        primary_diagnosis: Primary diagnosis (optional)
        individual_notes: Individual notes (optional)
        status: Patient status (default: "active")
        
    Returns:
        Dictionary containing the created patient data.
        
    Raises:
        DatabaseServiceError: If create operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        patient_data = {
            "user_id": user_id,
            "name": name.strip(),
            "status": status,
        }
        
        if age is not None:
            patient_data["age"] = age
        if gender:
            patient_data["gender"] = gender.strip()
        if primary_diagnosis:
            patient_data["primary_diagnosis"] = primary_diagnosis.strip()
        if individual_notes:
            patient_data["individual_notes"] = individual_notes.strip()
        
        logger.info(f"Creating patient for user {user_id}, name: {name}")
        
        response = supabase.table("patients").insert(patient_data).execute()
        
        if not response.data:
            raise DatabaseServiceError("Failed to create patient: No data returned")
        
        logger.info(f"Successfully created patient with ID: {response.data[0].get('id')}")
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating patient in database: {e}")
        raise DatabaseServiceError(f"Failed to create patient: {str(e)}") from e


def get_patients(
    user_id: str,
    status: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """
    Fetch all patients for a specific user.
    
    Args:
        user_id: Authenticated user ID
        status: Optional status filter (active/inactive/archived)
        
    Returns:
        List of dictionaries containing patient data, ordered by name.
        
    Raises:
        DatabaseServiceError: If fetch operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching patients for user {user_id}, status={status}")
        
        query = (
            supabase.table("patients")
            .select("*")
            .eq("user_id", user_id)
        )
        
        if status:
            query = query.eq("status", status)
        
        response = (
            query
            .order("name", desc=False)
            .execute()
        )
        
        if not response.data:
            logger.info(f"No patients found for user {user_id}")
            return []
        
        logger.info(f"Successfully fetched {len(response.data)} patients for user {user_id}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching patients from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch patients: {str(e)}") from e


def get_patient_by_id(patient_id: str, user_id: str) -> Dict[str, Any]:
    """
    Fetch a single patient by ID for a specific user.
    
    Args:
        patient_id: Patient ID (UUID)
        user_id: Authenticated user ID (for security check)
        
    Returns:
        Dictionary containing patient data.
        
    Raises:
        DatabaseServiceError: If fetch operation fails or patient not found.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching patient {patient_id} for user {user_id}")
        
        response = (
            supabase.table("patients")
            .select("*")
            .eq("id", patient_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Patient {patient_id} not found")
        
        logger.info(f"Successfully fetched patient {patient_id}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching patient from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch patient: {str(e)}") from e


def update_patient(
    patient_id: str,
    user_id: str,
    name: Optional[str] = None,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    primary_diagnosis: Optional[str] = None,
    individual_notes: Optional[str] = None,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update a patient record.
    
    Args:
        patient_id: Patient ID (UUID)
        user_id: Authenticated user ID (for security check)
        name: Updated patient name (optional)
        age: Updated patient age (optional)
        gender: Updated patient gender (optional)
        primary_diagnosis: Updated primary diagnosis (optional)
        individual_notes: Updated individual notes (optional)
        status: Updated patient status (optional)
        
    Returns:
        Dictionary containing the updated patient data.
        
    Raises:
        DatabaseServiceError: If update operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        update_data = {}
        if name is not None:
            update_data["name"] = name.strip()
        if age is not None:
            update_data["age"] = age
        if gender is not None:
            update_data["gender"] = gender.strip() if gender else None
        if primary_diagnosis is not None:
            update_data["primary_diagnosis"] = primary_diagnosis.strip() if primary_diagnosis else None
        if individual_notes is not None:
            update_data["individual_notes"] = individual_notes.strip() if individual_notes else None
        if status is not None:
            if status not in ["active", "inactive", "archived"]:
                raise DatabaseServiceError(f"Invalid status: {status}. Must be 'active', 'inactive', or 'archived'.")
            update_data["status"] = status
        
        if not update_data:
            raise DatabaseServiceError("No update data provided")
        
        logger.info(f"Updating patient {patient_id} for user {user_id}")
        
        response = (
            supabase.table("patients")
            .update(update_data)
            .eq("id", patient_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Patient {patient_id} not found or update failed")
        
        logger.info(f"Successfully updated patient {patient_id}")
        return response.data[0]
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error updating patient in database: {e}")
        raise DatabaseServiceError(f"Failed to update patient: {str(e)}") from e


def delete_patient(patient_id: str, user_id: str) -> None:
    """
    Delete a patient record.
    
    Args:
        patient_id: Patient ID (UUID)
        user_id: Authenticated user ID (for security check)
        
    Raises:
        DatabaseServiceError: If delete operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Deleting patient {patient_id} for user {user_id}")
        
        response = (
            supabase.table("patients")
            .delete()
            .eq("id", patient_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        logger.info(f"Successfully deleted patient {patient_id}")
        
    except Exception as e:
        logger.error(f"Error deleting patient from database: {e}")
        raise DatabaseServiceError(f"Failed to delete patient: {str(e)}") from e


# ============================================================================
# Care Plan CRUD Operations
# ============================================================================

def create_care_plan(
    user_id: str,
    patient_id: str,
    plan_output: Dict[str, Any],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: str = "active",
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a new care plan for a patient.
    
    Args:
        user_id: Authenticated user ID
        patient_id: Patient ID
        plan_output: Care plan structure (JSON)
        start_date: Start date (YYYY-MM-DD format, optional)
        end_date: End date (YYYY-MM-DD format, optional)
        status: Care plan status (default: "active")
        notes: Optional notes
        
    Returns:
        Dictionary containing the created care plan data.
        
    Raises:
        DatabaseServiceError: If create operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        care_plan_data = {
            "user_id": user_id,
            "patient_id": patient_id,
            "plan_output": plan_output,
            "status": status,
        }
        
        if start_date:
            care_plan_data["start_date"] = start_date
        if end_date:
            care_plan_data["end_date"] = end_date
        if notes:
            care_plan_data["notes"] = notes.strip()
        
        logger.info(f"Creating care plan for patient {patient_id}, user {user_id}")
        
        response = supabase.table("care_plans").insert(care_plan_data).execute()
        
        if not response.data:
            raise DatabaseServiceError("Failed to create care plan: No data returned")
        
        logger.info(f"Successfully created care plan with ID: {response.data[0].get('id')}")
        return response.data[0]
        
    except Exception as e:
        logger.error(f"Error creating care plan in database: {e}")
        raise DatabaseServiceError(f"Failed to create care plan: {str(e)}") from e


def get_care_plans_by_patient(
    user_id: str,
    patient_id: str,
    status: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """
    Fetch all care plans for a specific patient.
    
    Args:
        user_id: Authenticated user ID
        patient_id: Patient ID
        status: Optional status filter (active/inactive/completed)
        
    Returns:
        List of dictionaries containing care plan data, ordered by start_date DESC.
        
    Raises:
        DatabaseServiceError: If fetch operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching care plans for patient {patient_id}, user {user_id}, status={status}")
        
        query = (
            supabase.table("care_plans")
            .select("*")
            .eq("user_id", user_id)
            .eq("patient_id", patient_id)
        )
        
        if status:
            query = query.eq("status", status)
        
        response = (
            query
            .order("start_date", desc=True, nulls_last=True)
            .order("created_at", desc=True)
            .execute()
        )
        
        if not response.data:
            logger.info(f"No care plans found for patient {patient_id}")
            return []
        
        logger.info(f"Successfully fetched {len(response.data)} care plans for patient {patient_id}")
        return response.data
        
    except Exception as e:
        logger.error(f"Error fetching care plans from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch care plans: {str(e)}") from e


# ============================================================================
# SOAP Record Operations (Updated to support patient_id)
# ============================================================================

def save_soap_record(
    user_id: str,
    patient_id: Optional[str] = None,
    patient_name: Optional[str] = None,
    diagnosis: Optional[str] = None,
    visit_date: str = "",
    start_time: str = "",
    end_time: str = "",
    nurses: list[str] = None,
    chief_complaint: str = "",
    s_text: str = "",
    o_text: str = "",
    soap_output: Dict[str, Any] = None,
    plan_output: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Save SOAP record to Supabase database.
    
    Args:
        user_id: Authenticated user ID
        patient_id: Patient ID (preferred, if provided patient_name/diagnosis are ignored)
        patient_name: Patient name (for backward compatibility, used if patient_id not provided)
        diagnosis: Primary diagnosis (for backward compatibility, used if patient_id not provided)
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
            "visit_date": visit_date,
            "start_time": start_time,
            "end_time": end_time,
            "nurses": nurses or [],
            "chief_complaint": chief_complaint,
            "s_text": s_text,
            "o_text": o_text,
        }
        
        # Use patient_id if provided, otherwise fall back to patient_name/diagnosis
        if patient_id:
            record_data["patient_id"] = patient_id
            # Fetch patient data to include in response
            try:
                patient = get_patient_by_id(patient_id, user_id)
                record_data["patient_name"] = patient["name"]
                record_data["diagnosis"] = patient.get("primary_diagnosis")
            except DatabaseServiceError:
                logger.warning(f"Patient {patient_id} not found, using provided patient_name/diagnosis")
                if patient_name:
                    record_data["patient_name"] = patient_name
                if diagnosis:
                    record_data["diagnosis"] = diagnosis
        else:
            # Backward compatibility: use patient_name and diagnosis directly
            if patient_name:
                record_data["patient_name"] = patient_name
            if diagnosis:
                record_data["diagnosis"] = diagnosis
        
        if soap_output:
            record_data["soap_output"] = soap_output
        if plan_output:
            record_data["plan_output"] = plan_output
        
        logger.info(f"Saving SOAP record for user {user_id}, patient_id={patient_id}, patient_name={patient_name}")
        
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
    patient_id: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """
    Fetch SOAP records for a specific user from Supabase database.
    
    Args:
        user_id: Authenticated user ID
        limit: Maximum number of records to return (default: 100)
        date_from: Start date for filtering (YYYY-MM-DD format, inclusive)
        date_to: End date for filtering (YYYY-MM-DD format, inclusive)
        nurse_name: Nurse name for filtering (exact match in nurses array)
        patient_id: Patient ID for filtering
        
    Returns:
        List of dictionaries containing SOAP record data, ordered by visit_date DESC.
        
    Raises:
        DatabaseServiceError: If fetch operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching SOAP records for user {user_id} with filters: date_from={date_from}, date_to={date_to}, nurse_name={nurse_name}, patient_id={patient_id}")
        
        query = (
            supabase.table("soap_records")
            .select("*")
            .eq("user_id", user_id)
        )
        
        # Apply patient filter
        if patient_id:
            query = query.eq("patient_id", patient_id)
        
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
    patient_id: Optional[str] = None,
    patient_name: Optional[str] = None,
    year: int = 0,
    month: int = 0,
) -> list[Dict[str, Any]]:
    """
    Fetch SOAP records for a specific patient in a specific month.
    
    Args:
        user_id: Authenticated user ID
        patient_id: Patient ID (preferred)
        patient_name: Patient name (for backward compatibility, used if patient_id not provided)
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
        
        logger.info(f"Fetching visits for patient_id={patient_id}, patient_name={patient_name} in {year}-{month:02d}")
        
        query = (
            supabase.table("soap_records")
            .select("*")
            .eq("user_id", user_id)
            .gte("visit_date", start_date)
            .lt("visit_date", end_date)
        )
        
        # Filter by patient_id if provided, otherwise by patient_name
        if patient_id:
            query = query.eq("patient_id", patient_id)
        elif patient_name:
            query = query.eq("patient_name", patient_name)
        else:
            raise DatabaseServiceError("Either patient_id or patient_name must be provided")
        
        response = (
            query
            .order("visit_date", desc=False)
            .order("created_at", desc=False)
            .execute()
        )
        
        if not response.data:
            logger.info(f"No visits found for patient_id={patient_id}, patient_name={patient_name} in {year}-{month:02d}")
            return []
        
        logger.info(f"Successfully fetched {len(response.data)} visits for patient_id={patient_id}, patient_name={patient_name} in {year}-{month:02d}")
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


# ============================================================================
# Visit Records CRUD Operations
# ============================================================================

def create_visit_record(
    user_id: str,
    patient_id: str,
    patient_name: str,
    gender: Optional[str] = None,
    birth_date: Optional[str] = None,
    birth_date_year: Optional[int] = None,
    birth_date_month: Optional[int] = None,
    birth_date_day: Optional[int] = None,
    age: Optional[int] = None,
    patient_address: Optional[str] = None,
    patient_contact: Optional[str] = None,
    key_person_name: Optional[str] = None,
    key_person_relationship: Optional[str] = None,
    key_person_address: Optional[str] = None,
    key_person_contact1: Optional[str] = None,
    key_person_contact2: Optional[str] = None,
    initial_visit_date: Optional[str] = None,
    initial_visit_year: Optional[int] = None,
    initial_visit_month: Optional[int] = None,
    initial_visit_day: Optional[int] = None,
    initial_visit_day_of_week: Optional[str] = None,
    initial_visit_start_hour: Optional[int] = None,
    initial_visit_start_minute: Optional[int] = None,
    initial_visit_end_hour: Optional[int] = None,
    initial_visit_end_minute: Optional[int] = None,
    main_disease: Optional[str] = None,
    medical_history: Optional[str] = None,
    current_illness_history: Optional[str] = None,
    family_structure: Optional[str] = None,
    daily_life_meal_nutrition: Optional[str] = None,
    daily_life_hygiene: Optional[str] = None,
    daily_life_medication: Optional[str] = None,
    daily_life_sleep: Optional[str] = None,
    daily_life_living_environment: Optional[str] = None,
    daily_life_family_environment: Optional[str] = None,
    doctor_name: Optional[str] = None,
    hospital_name: Optional[str] = None,
    hospital_address: Optional[str] = None,
    hospital_phone: Optional[str] = None,
    notes: Optional[str] = None,
    recorder_name: Optional[str] = None,
    status: str = "active",
) -> Dict[str, Any]:
    """
    Create a new visit record.
    
    Returns:
        Dictionary containing the created visit record data.
        
    Raises:
        DatabaseServiceError: If create operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        visit_record_data = {
            "user_id": user_id,
            "patient_id": patient_id,
            "patient_name": patient_name.strip(),
            "status": status,
        }
        
        # Add all optional fields if provided
        optional_fields = {
            "gender": gender,
            "birth_date": birth_date,
            "birth_date_year": birth_date_year,
            "birth_date_month": birth_date_month,
            "birth_date_day": birth_date_day,
            "age": age,
            "patient_address": patient_address,
            "patient_contact": patient_contact,
            "key_person_name": key_person_name,
            "key_person_relationship": key_person_relationship,
            "key_person_address": key_person_address,
            "key_person_contact1": key_person_contact1,
            "key_person_contact2": key_person_contact2,
            "initial_visit_date": initial_visit_date,
            "initial_visit_year": initial_visit_year,
            "initial_visit_month": initial_visit_month,
            "initial_visit_day": initial_visit_day,
            "initial_visit_day_of_week": initial_visit_day_of_week,
            "initial_visit_start_hour": initial_visit_start_hour,
            "initial_visit_start_minute": initial_visit_start_minute,
            "initial_visit_end_hour": initial_visit_end_hour,
            "initial_visit_end_minute": initial_visit_end_minute,
            "main_disease": main_disease,
            "medical_history": medical_history,
            "current_illness_history": current_illness_history,
            "family_structure": family_structure,
            "daily_life_meal_nutrition": daily_life_meal_nutrition,
            "daily_life_hygiene": daily_life_hygiene,
            "daily_life_medication": daily_life_medication,
            "daily_life_sleep": daily_life_sleep,
            "daily_life_living_environment": daily_life_living_environment,
            "daily_life_family_environment": daily_life_family_environment,
            "doctor_name": doctor_name,
            "hospital_name": hospital_name,
            "hospital_address": hospital_address,
            "hospital_phone": hospital_phone,
            "notes": notes,
            "recorder_name": recorder_name,
        }
        
        for field, value in optional_fields.items():
            if value is not None:
                if isinstance(value, str):
                    visit_record_data[field] = value.strip() if value else None
                else:
                    visit_record_data[field] = value
        
        logger.info(f"Creating visit record for user {user_id}, patient: {patient_name}")
        
        response = supabase.table("visit_records").insert(visit_record_data).execute()
        
        if not response.data:
            raise DatabaseServiceError("Failed to create visit record")
        
        record = response.data[0]
        logger.info(f"Successfully created visit record {record['id']}")
        
        # Convert all values to strings for response
        return {
            "id": str(record["id"]),
            "user_id": str(record["user_id"]),
            "patient_id": str(record["patient_id"]),
            "patient_name": record["patient_name"],
            "gender": record.get("gender"),
            "birth_date": str(record["birth_date"]) if record.get("birth_date") else None,
            "birth_date_year": record.get("birth_date_year"),
            "birth_date_month": record.get("birth_date_month"),
            "birth_date_day": record.get("birth_date_day"),
            "age": record.get("age"),
            "patient_address": record.get("patient_address"),
            "patient_contact": record.get("patient_contact"),
            "key_person_name": record.get("key_person_name"),
            "key_person_relationship": record.get("key_person_relationship"),
            "key_person_address": record.get("key_person_address"),
            "key_person_contact1": record.get("key_person_contact1"),
            "key_person_contact2": record.get("key_person_contact2"),
            "initial_visit_date": str(record["initial_visit_date"]) if record.get("initial_visit_date") else None,
            "initial_visit_year": record.get("initial_visit_year"),
            "initial_visit_month": record.get("initial_visit_month"),
            "initial_visit_day": record.get("initial_visit_day"),
            "initial_visit_day_of_week": record.get("initial_visit_day_of_week"),
            "initial_visit_start_hour": record.get("initial_visit_start_hour"),
            "initial_visit_start_minute": record.get("initial_visit_start_minute"),
            "initial_visit_end_hour": record.get("initial_visit_end_hour"),
            "initial_visit_end_minute": record.get("initial_visit_end_minute"),
            "main_disease": record.get("main_disease"),
            "medical_history": record.get("medical_history"),
            "current_illness_history": record.get("current_illness_history"),
            "family_structure": record.get("family_structure"),
            "daily_life_meal_nutrition": record.get("daily_life_meal_nutrition"),
            "daily_life_hygiene": record.get("daily_life_hygiene"),
            "daily_life_medication": record.get("daily_life_medication"),
            "daily_life_sleep": record.get("daily_life_sleep"),
            "daily_life_living_environment": record.get("daily_life_living_environment"),
            "daily_life_family_environment": record.get("daily_life_family_environment"),
            "doctor_name": record.get("doctor_name"),
            "hospital_name": record.get("hospital_name"),
            "hospital_address": record.get("hospital_address"),
            "hospital_phone": record.get("hospital_phone"),
            "notes": record.get("notes"),
            "recorder_name": record.get("recorder_name"),
            "status": record["status"],
            "created_at": str(record["created_at"]),
            "updated_at": str(record["updated_at"]),
        }
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error creating visit record in database: {e}")
        raise DatabaseServiceError(f"Failed to create visit record: {str(e)}") from e


def get_visit_records(
    user_id: str,
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """
    Fetch all visit records for a user with optional filters.
    
    Args:
        user_id: Authenticated user ID
        patient_id: Filter by patient ID (optional)
        status: Filter by status (optional)
        
    Returns:
        List of visit records ordered by creation date (newest first).
        
    Raises:
        DatabaseServiceError: If query fails.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("visit_records").select("*").eq("user_id", user_id)
        
        if patient_id:
            query = query.eq("patient_id", patient_id)
        if status:
            query = query.eq("status", status)
        
        query = query.order("created_at", desc=True)
        
        logger.info(f"Fetching visit records for user {user_id}")
        
        response = query.execute()
        
        if not response.data:
            logger.info(f"No visit records found for user {user_id}")
            return []
        
        logger.info(f"Found {len(response.data)} visit records for user {user_id}")
        
        # Convert all records
        result = []
        for record in response.data:
            result.append({
                "id": str(record["id"]),
                "user_id": str(record["user_id"]),
                "patient_id": str(record["patient_id"]),
                "patient_name": record["patient_name"],
                "gender": record.get("gender"),
                "birth_date": str(record["birth_date"]) if record.get("birth_date") else None,
                "birth_date_year": record.get("birth_date_year"),
                "birth_date_month": record.get("birth_date_month"),
                "birth_date_day": record.get("birth_date_day"),
                "age": record.get("age"),
                "patient_address": record.get("patient_address"),
                "patient_contact": record.get("patient_contact"),
                "key_person_name": record.get("key_person_name"),
                "key_person_relationship": record.get("key_person_relationship"),
                "key_person_address": record.get("key_person_address"),
                "key_person_contact1": record.get("key_person_contact1"),
                "key_person_contact2": record.get("key_person_contact2"),
                "initial_visit_date": str(record["initial_visit_date"]) if record.get("initial_visit_date") else None,
                "initial_visit_year": record.get("initial_visit_year"),
                "initial_visit_month": record.get("initial_visit_month"),
                "initial_visit_day": record.get("initial_visit_day"),
                "initial_visit_day_of_week": record.get("initial_visit_day_of_week"),
                "initial_visit_start_hour": record.get("initial_visit_start_hour"),
                "initial_visit_start_minute": record.get("initial_visit_start_minute"),
                "initial_visit_end_hour": record.get("initial_visit_end_hour"),
                "initial_visit_end_minute": record.get("initial_visit_end_minute"),
                "main_disease": record.get("main_disease"),
                "medical_history": record.get("medical_history"),
                "current_illness_history": record.get("current_illness_history"),
                "family_structure": record.get("family_structure"),
                "daily_life_meal_nutrition": record.get("daily_life_meal_nutrition"),
                "daily_life_hygiene": record.get("daily_life_hygiene"),
                "daily_life_medication": record.get("daily_life_medication"),
                "daily_life_sleep": record.get("daily_life_sleep"),
                "daily_life_living_environment": record.get("daily_life_living_environment"),
                "daily_life_family_environment": record.get("daily_life_family_environment"),
                "doctor_name": record.get("doctor_name"),
                "hospital_name": record.get("hospital_name"),
                "hospital_address": record.get("hospital_address"),
                "hospital_phone": record.get("hospital_phone"),
                "notes": record.get("notes"),
                "recorder_name": record.get("recorder_name"),
                "status": record["status"],
                "created_at": str(record["created_at"]),
                "updated_at": str(record["updated_at"]),
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching visit records from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch visit records: {str(e)}") from e


def get_visit_record_by_id(visit_record_id: str, user_id: str) -> Dict[str, Any]:
    """
    Fetch a single visit record by ID.
    
    Args:
        visit_record_id: Visit record ID (UUID)
        user_id: Authenticated user ID (for security check)
        
    Returns:
        Dictionary containing the visit record data.
        
    Raises:
        DatabaseServiceError: If query fails or record not found.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Fetching visit record {visit_record_id} for user {user_id}")
        
        response = (
            supabase.table("visit_records")
            .select("*")
            .eq("id", visit_record_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Visit record {visit_record_id} not found")
        
        record = response.data[0]
        logger.info(f"Successfully fetched visit record {visit_record_id}")
        
        return {
            "id": str(record["id"]),
            "user_id": str(record["user_id"]),
            "patient_id": str(record["patient_id"]),
            "patient_name": record["patient_name"],
            "gender": record.get("gender"),
            "birth_date": str(record["birth_date"]) if record.get("birth_date") else None,
            "birth_date_year": record.get("birth_date_year"),
            "birth_date_month": record.get("birth_date_month"),
            "birth_date_day": record.get("birth_date_day"),
            "age": record.get("age"),
            "patient_address": record.get("patient_address"),
            "patient_contact": record.get("patient_contact"),
            "key_person_name": record.get("key_person_name"),
            "key_person_relationship": record.get("key_person_relationship"),
            "key_person_address": record.get("key_person_address"),
            "key_person_contact1": record.get("key_person_contact1"),
            "key_person_contact2": record.get("key_person_contact2"),
            "initial_visit_date": str(record["initial_visit_date"]) if record.get("initial_visit_date") else None,
            "initial_visit_year": record.get("initial_visit_year"),
            "initial_visit_month": record.get("initial_visit_month"),
            "initial_visit_day": record.get("initial_visit_day"),
            "initial_visit_day_of_week": record.get("initial_visit_day_of_week"),
            "initial_visit_start_hour": record.get("initial_visit_start_hour"),
            "initial_visit_start_minute": record.get("initial_visit_start_minute"),
            "initial_visit_end_hour": record.get("initial_visit_end_hour"),
            "initial_visit_end_minute": record.get("initial_visit_end_minute"),
            "main_disease": record.get("main_disease"),
            "medical_history": record.get("medical_history"),
            "current_illness_history": record.get("current_illness_history"),
            "family_structure": record.get("family_structure"),
            "daily_life_meal_nutrition": record.get("daily_life_meal_nutrition"),
            "daily_life_hygiene": record.get("daily_life_hygiene"),
            "daily_life_medication": record.get("daily_life_medication"),
            "daily_life_sleep": record.get("daily_life_sleep"),
            "daily_life_living_environment": record.get("daily_life_living_environment"),
            "daily_life_family_environment": record.get("daily_life_family_environment"),
            "doctor_name": record.get("doctor_name"),
            "hospital_name": record.get("hospital_name"),
            "hospital_address": record.get("hospital_address"),
            "hospital_phone": record.get("hospital_phone"),
            "notes": record.get("notes"),
            "recorder_name": record.get("recorder_name"),
            "status": record["status"],
            "created_at": str(record["created_at"]),
            "updated_at": str(record["updated_at"]),
        }
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error fetching visit record from database: {e}")
        raise DatabaseServiceError(f"Failed to fetch visit record: {str(e)}") from e


def update_visit_record(
    visit_record_id: str,
    user_id: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Update a visit record.
    
    Args:
        visit_record_id: Visit record ID (UUID)
        user_id: Authenticated user ID (for security check)
        **kwargs: Fields to update
        
    Returns:
        Dictionary containing the updated visit record data.
        
    Raises:
        DatabaseServiceError: If update operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        update_data = {}
        
        # Process all possible fields
        for field, value in kwargs.items():
            if value is not None:
                if isinstance(value, str):
                    update_data[field] = value.strip() if value else None
                else:
                    update_data[field] = value
        
        if not update_data:
            raise DatabaseServiceError("No update data provided")
        
        # Validate status if provided
        if "status" in update_data and update_data["status"] not in ["active", "inactive", "archived"]:
            raise DatabaseServiceError(f"Invalid status: {update_data['status']}. Must be 'active', 'inactive', or 'archived'.")
        
        logger.info(f"Updating visit record {visit_record_id} for user {user_id}")
        
        response = (
            supabase.table("visit_records")
            .update(update_data)
            .eq("id", visit_record_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not response.data:
            raise DatabaseServiceError(f"Visit record {visit_record_id} not found or update failed")
        
        record = response.data[0]
        logger.info(f"Successfully updated visit record {visit_record_id}")
        
        return {
            "id": str(record["id"]),
            "user_id": str(record["user_id"]),
            "patient_id": str(record["patient_id"]),
            "patient_name": record["patient_name"],
            "gender": record.get("gender"),
            "birth_date": str(record["birth_date"]) if record.get("birth_date") else None,
            "birth_date_year": record.get("birth_date_year"),
            "birth_date_month": record.get("birth_date_month"),
            "birth_date_day": record.get("birth_date_day"),
            "age": record.get("age"),
            "patient_address": record.get("patient_address"),
            "patient_contact": record.get("patient_contact"),
            "key_person_name": record.get("key_person_name"),
            "key_person_relationship": record.get("key_person_relationship"),
            "key_person_address": record.get("key_person_address"),
            "key_person_contact1": record.get("key_person_contact1"),
            "key_person_contact2": record.get("key_person_contact2"),
            "initial_visit_date": str(record["initial_visit_date"]) if record.get("initial_visit_date") else None,
            "initial_visit_year": record.get("initial_visit_year"),
            "initial_visit_month": record.get("initial_visit_month"),
            "initial_visit_day": record.get("initial_visit_day"),
            "initial_visit_day_of_week": record.get("initial_visit_day_of_week"),
            "initial_visit_start_hour": record.get("initial_visit_start_hour"),
            "initial_visit_start_minute": record.get("initial_visit_start_minute"),
            "initial_visit_end_hour": record.get("initial_visit_end_hour"),
            "initial_visit_end_minute": record.get("initial_visit_end_minute"),
            "main_disease": record.get("main_disease"),
            "medical_history": record.get("medical_history"),
            "current_illness_history": record.get("current_illness_history"),
            "family_structure": record.get("family_structure"),
            "daily_life_meal_nutrition": record.get("daily_life_meal_nutrition"),
            "daily_life_hygiene": record.get("daily_life_hygiene"),
            "daily_life_medication": record.get("daily_life_medication"),
            "daily_life_sleep": record.get("daily_life_sleep"),
            "daily_life_living_environment": record.get("daily_life_living_environment"),
            "daily_life_family_environment": record.get("daily_life_family_environment"),
            "doctor_name": record.get("doctor_name"),
            "hospital_name": record.get("hospital_name"),
            "hospital_address": record.get("hospital_address"),
            "hospital_phone": record.get("hospital_phone"),
            "notes": record.get("notes"),
            "recorder_name": record.get("recorder_name"),
            "status": record["status"],
            "created_at": str(record["created_at"]),
            "updated_at": str(record["updated_at"]),
        }
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error updating visit record in database: {e}")
        raise DatabaseServiceError(f"Failed to update visit record: {str(e)}") from e


def delete_visit_record(visit_record_id: str, user_id: str) -> None:
    """
    Delete a visit record.
    
    Args:
        visit_record_id: Visit record ID (UUID)
        user_id: Authenticated user ID (for security check)
        
    Raises:
        DatabaseServiceError: If delete operation fails.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"Deleting visit record {visit_record_id} for user {user_id}")
        
        response = (
            supabase.table("visit_records")
            .delete()
            .eq("id", visit_record_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        logger.info(f"Successfully deleted visit record {visit_record_id}")
        
    except Exception as e:
        logger.error(f"Error deleting visit record from database: {e}")
        raise DatabaseServiceError(f"Failed to delete visit record: {str(e)}") from e