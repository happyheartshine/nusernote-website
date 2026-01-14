"""Database service for Supabase operations.

This module provides database operations organized into service classes:
- BaseDatabaseService: Common database operations
- PatientService: Patient CRUD operations
- CarePlanService: Care plan operations
- SOAPRecordService: SOAP record operations
- PlanService: Plan operations

All functions maintain backward compatibility as module-level wrappers.
"""

import logging
from typing import Any, Dict, Optional

from supabase import create_client, Client

from config import settings

logger = logging.getLogger(__name__)

# ============================================================================
# Client Management
# ============================================================================

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


# ============================================================================
# Exceptions
# ============================================================================

class DatabaseServiceError(Exception):
    """Exception raised for database service errors."""
    pass


# ============================================================================
# Base Database Service
# ============================================================================

class BaseDatabaseService:
    """Base class for database services with common functionality."""
    
    def __init__(self):
        """Initialize the database service."""
        self._client: Optional[Client] = None
    
    @property
    def client(self) -> Client:
        """Get Supabase client instance."""
        if self._client is None:
            self._client = get_supabase_client()
        return self._client
    
    def _handle_error(self, operation: str, error: Exception) -> None:
        """Handle database errors consistently."""
        logger.error(f"Error {operation}: {error}")
        raise DatabaseServiceError(f"Failed to {operation}: {str(error)}") from error


# ============================================================================
# Patient Service
# ============================================================================

class PatientService(BaseDatabaseService):
    """Service for patient CRUD operations."""
    
    def create(
        self,
        user_id: str,
        name: str,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        primary_diagnosis: Optional[str] = None,
        individual_notes: Optional[str] = None,
        status: str = "active",
        birth_date: Optional[str] = None,
        birth_date_year: Optional[int] = None,
        birth_date_month: Optional[int] = None,
        birth_date_day: Optional[int] = None,
        address: Optional[str] = None,
        contact: Optional[str] = None,
        key_person_name: Optional[str] = None,
        key_person_relationship: Optional[str] = None,
        key_person_address: Optional[str] = None,
        key_person_contact1: Optional[str] = None,
        key_person_contact2: Optional[str] = None,
        medical_history: Optional[str] = None,
        current_illness_history: Optional[str] = None,
        family_structure: Optional[str] = None,
        doctor_name: Optional[str] = None,
        hospital_name: Optional[str] = None,
        hospital_address: Optional[str] = None,
        hospital_phone: Optional[str] = None,
        initial_visit_date: Optional[str] = None,
        initial_visit_year: Optional[int] = None,
        initial_visit_month: Optional[int] = None,
        initial_visit_day: Optional[int] = None,
        initial_visit_day_of_week: Optional[str] = None,
        initial_visit_start_hour: Optional[int] = None,
        initial_visit_start_minute: Optional[int] = None,
        initial_visit_end_hour: Optional[int] = None,
        initial_visit_end_minute: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a new patient record."""
        try:
            patient_data = {
                "user_id": user_id,
                "name": name.strip(),
                "status": status,
            }
            
            # Basic fields
            if age is not None:
                patient_data["age"] = age
            if gender:
                patient_data["gender"] = gender.strip()
            if primary_diagnosis:
                patient_data["primary_diagnosis"] = primary_diagnosis.strip()
            if individual_notes:
                patient_data["individual_notes"] = individual_notes.strip()
            
            # Additional patient information
            optional_fields = {
                "birth_date": birth_date,
                "birth_date_year": birth_date_year,
                "birth_date_month": birth_date_month,
                "birth_date_day": birth_date_day,
                "address": address,
                "contact": contact,
                "key_person_name": key_person_name,
                "key_person_relationship": key_person_relationship,
                "key_person_address": key_person_address,
                "key_person_contact1": key_person_contact1,
                "key_person_contact2": key_person_contact2,
                "medical_history": medical_history,
                "current_illness_history": current_illness_history,
                "family_structure": family_structure,
                "doctor_name": doctor_name,
                "hospital_name": hospital_name,
                "hospital_address": hospital_address,
                "hospital_phone": hospital_phone,
                "initial_visit_date": initial_visit_date,
                "initial_visit_year": initial_visit_year,
                "initial_visit_month": initial_visit_month,
                "initial_visit_day": initial_visit_day,
                "initial_visit_day_of_week": initial_visit_day_of_week,
                "initial_visit_start_hour": initial_visit_start_hour,
                "initial_visit_start_minute": initial_visit_start_minute,
                "initial_visit_end_hour": initial_visit_end_hour,
                "initial_visit_end_minute": initial_visit_end_minute,
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    if isinstance(value, str):
                        patient_data[field] = value.strip() if value else None
                    else:
                        patient_data[field] = value
            
            logger.info(f"Creating patient for user {user_id}, name: {name}")
            
            response = self.client.table("patients").insert(patient_data).execute()
            
            if not response.data:
                raise DatabaseServiceError("Failed to create patient: No data returned")
            
            logger.info(f"Successfully created patient with ID: {response.data[0].get('id')}")
            return response.data[0]
            
        except Exception as e:
            self._handle_error("create patient", e)
    
    def get_all(self, user_id: str, status: Optional[str] = None) -> list[Dict[str, Any]]:
        """Fetch all patients for a specific user."""
        try:
            logger.info(f"Fetching patients for user {user_id}, status={status}")
            
            query = (
                self.client.table("patients")
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
            self._handle_error("fetch patients", e)
    
    def get_by_id(self, patient_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch a single patient by ID for a specific user."""
        try:
            logger.info(f"Fetching patient {patient_id} for user {user_id}")
            
            response = (
                self.client.table("patients")
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
            self._handle_error("fetch patient", e)
    
    def update(
        self,
        patient_id: str,
        user_id: str,
        name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        primary_diagnosis: Optional[str] = None,
        individual_notes: Optional[str] = None,
        status: Optional[str] = None,
        birth_date: Optional[str] = None,
        birth_date_year: Optional[int] = None,
        birth_date_month: Optional[int] = None,
        birth_date_day: Optional[int] = None,
        address: Optional[str] = None,
        contact: Optional[str] = None,
        key_person_name: Optional[str] = None,
        key_person_relationship: Optional[str] = None,
        key_person_address: Optional[str] = None,
        key_person_contact1: Optional[str] = None,
        key_person_contact2: Optional[str] = None,
        medical_history: Optional[str] = None,
        current_illness_history: Optional[str] = None,
        family_structure: Optional[str] = None,
        doctor_name: Optional[str] = None,
        hospital_name: Optional[str] = None,
        hospital_address: Optional[str] = None,
        hospital_phone: Optional[str] = None,
        initial_visit_date: Optional[str] = None,
        initial_visit_year: Optional[int] = None,
        initial_visit_month: Optional[int] = None,
        initial_visit_day: Optional[int] = None,
        initial_visit_day_of_week: Optional[str] = None,
        initial_visit_start_hour: Optional[int] = None,
        initial_visit_start_minute: Optional[int] = None,
        initial_visit_end_hour: Optional[int] = None,
        initial_visit_end_minute: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Update a patient record."""
        try:
            update_data = {}
            
            # Basic fields
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
            
            # Additional patient information
            optional_fields = {
                "birth_date": birth_date,
                "birth_date_year": birth_date_year,
                "birth_date_month": birth_date_month,
                "birth_date_day": birth_date_day,
                "address": address,
                "contact": contact,
                "key_person_name": key_person_name,
                "key_person_relationship": key_person_relationship,
                "key_person_address": key_person_address,
                "key_person_contact1": key_person_contact1,
                "key_person_contact2": key_person_contact2,
                "medical_history": medical_history,
                "current_illness_history": current_illness_history,
                "family_structure": family_structure,
                "doctor_name": doctor_name,
                "hospital_name": hospital_name,
                "hospital_address": hospital_address,
                "hospital_phone": hospital_phone,
                "initial_visit_date": initial_visit_date,
                "initial_visit_year": initial_visit_year,
                "initial_visit_month": initial_visit_month,
                "initial_visit_day": initial_visit_day,
                "initial_visit_day_of_week": initial_visit_day_of_week,
                "initial_visit_start_hour": initial_visit_start_hour,
                "initial_visit_start_minute": initial_visit_start_minute,
                "initial_visit_end_hour": initial_visit_end_hour,
                "initial_visit_end_minute": initial_visit_end_minute,
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    if isinstance(value, str):
                        update_data[field] = value.strip() if value else None
                    else:
                        update_data[field] = value
            
            if not update_data:
                raise DatabaseServiceError("No update data provided")
            
            logger.info(f"Updating patient {patient_id} for user {user_id}")
            
            response = (
                self.client.table("patients")
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
            self._handle_error("update patient", e)
    
    def delete(self, patient_id: str, user_id: str) -> None:
        """
        Delete a patient record.
        
        Note: This will cascade delete:
        - All associated SOAP records (if foreign key constraint is CASCADE)
        - All associated plans and their items/evaluations/hospitalizations (CASCADE)
        
        Raises:
            DatabaseServiceError: If deletion fails or patient has associated records
                and foreign key constraint is RESTRICT.
        """
        try:
            logger.info(f"Deleting patient {patient_id} for user {user_id}")
            
            # Check if patient exists first
            existing = (
                self.client.table("patients")
                .select("id")
                .eq("id", patient_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            if not existing.data:
                raise DatabaseServiceError(f"Patient {patient_id} not found")
            
            # Attempt deletion
            response = (
                self.client.table("patients")
                .delete()
                .eq("id", patient_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            logger.info(f"Successfully deleted patient {patient_id}")
            
        except Exception as e:
            error_msg = str(e).lower()
            # Provide helpful error message for foreign key constraint violations
            if "foreign key constraint" in error_msg or "violates foreign key" in error_msg:
                raise DatabaseServiceError(
                    f"Cannot delete patient {patient_id}: Patient has associated records (SOAP records or plans). "
                    "Please delete or reassign associated records first, or run migration to enable CASCADE deletion."
                ) from e
            self._handle_error("delete patient", e)


# ============================================================================
# Care Plan Service
# ============================================================================

class CarePlanService(BaseDatabaseService):
    """Service for care plan operations."""
    
    def create(
        self,
        user_id: str,
        patient_id: str,
        plan_output: Dict[str, Any],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        status: str = "active",
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new care plan for a patient."""
        try:
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
            
            response = self.client.table("care_plans").insert(care_plan_data).execute()
            
            if not response.data:
                raise DatabaseServiceError("Failed to create care plan: No data returned")
            
            logger.info(f"Successfully created care plan with ID: {response.data[0].get('id')}")
            return response.data[0]
            
        except Exception as e:
            self._handle_error("create care plan", e)
    
    def get_by_patient(
        self,
        user_id: str,
        patient_id: str,
        status: Optional[str] = None,
    ) -> list[Dict[str, Any]]:
        """Fetch all care plans for a specific patient."""
        try:
            logger.info(f"Fetching care plans for patient {patient_id}, user {user_id}, status={status}")
            
            query = (
                self.client.table("care_plans")
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
            self._handle_error("fetch care plans", e)


# ============================================================================
# SOAP Record Service
# ============================================================================

class SOAPRecordService(BaseDatabaseService):
    """Service for SOAP record operations."""
    
    def save(
        self,
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
        """Save SOAP record to Supabase database."""
        try:
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
                    patient_service = PatientService()
                    patient = patient_service.get_by_id(patient_id, user_id)
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
            
            response = self.client.table("soap_records").insert(record_data).execute()
            
            if not response.data:
                raise DatabaseServiceError("Failed to save record: No data returned")
            
            logger.info(f"Successfully saved SOAP record with ID: {response.data[0].get('id')}")
            return response.data[0]
            
        except Exception as e:
            self._handle_error("save SOAP record", e)
    
    def get_all(
        self,
        user_id: str,
        limit: Optional[int] = 100,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        nurse_name: Optional[str] = None,
        patient_id: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = None,
    ) -> list[Dict[str, Any]]:
        """Fetch SOAP records for a specific user."""
        try:
            logger.info(f"Fetching SOAP records for user_id={user_id} with filters: date_from={date_from}, date_to={date_to}, nurse_name={nurse_name}, patient_id={patient_id}, page={page}, page_size={page_size}")
            
            if not user_id:
                raise DatabaseServiceError("user_id is required to fetch SOAP records")
            
            query = (
                self.client.table("soap_records")
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
            
            # Apply nurse filter
            if nurse_name:
                query = query.contains("nurses", [nurse_name])
            
            # Apply pagination if provided
            if page is not None and page_size is not None:
                offset = (page - 1) * page_size
                query = query.range(offset, offset + page_size - 1)
            elif limit is not None:
                query = query.limit(limit)
            
            response = (
                query
                .order("visit_date", desc=True)
                .order("created_at", desc=True)
                .execute()
            )
            
            if not response.data:
                logger.info(f"No records found for user {user_id}")
                return []
            
            logger.info(f"Successfully fetched {len(response.data)} records for user {user_id}")
            return response.data
            
        except Exception as e:
            self._handle_error("fetch SOAP records", e)
    
    def get_by_id(self, record_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch a single SOAP record by ID for a specific user."""
        try:
            logger.info(f"Fetching SOAP record {record_id} for user {user_id}")
            
            response = (
                self.client.table("soap_records")
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
            self._handle_error("fetch SOAP record", e)
    
    def get_by_patient_and_month(
        self,
        user_id: str,
        patient_id: Optional[str] = None,
        patient_name: Optional[str] = None,
        year: int = 0,
        month: int = 0,
    ) -> list[Dict[str, Any]]:
        """Fetch SOAP records for a specific patient in a specific month."""
        try:
            from datetime import datetime
            
            # Calculate start and end dates for the month
            start_date = datetime(year, month, 1).strftime('%Y-%m-%d')
            if month == 12:
                end_date = datetime(year + 1, 1, 1).strftime('%Y-%m-%d')
            else:
                end_date = datetime(year, month + 1, 1).strftime('%Y-%m-%d')
            
            logger.info(f"Fetching visits for patient_id={patient_id}, patient_name={patient_name} in {year}-{month:02d}")
            
            query = (
                self.client.table("soap_records")
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
            self._handle_error("fetch visits by patient and month", e)
    
    def update(
        self,
        record_id: str,
        user_id: str,
        soap_output: Optional[Dict[str, Any]] = None,
        plan_output: Optional[Dict[str, Any]] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Update a SOAP record in Supabase database."""
        try:
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
                self.client.table("soap_records")
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
            self._handle_error("update SOAP record", e)
    
    def get_latest_for_patient(self, patient_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the latest SOAP record for a specific patient."""
        try:
            logger.info(f"Fetching latest SOAP record for patient {patient_id}, user {user_id}")
            
            response = (
                self.client.table("soap_records")
                .select("*")
                .eq("patient_id", patient_id)
                .eq("user_id", user_id)
                .order("visit_date", desc=True)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            
            if not response.data or len(response.data) == 0:
                logger.info(f"No SOAP records found for patient {patient_id}")
                return None
            
            logger.info(f"Successfully fetched latest SOAP record for patient {patient_id}")
            return response.data[0]
            
        except Exception as e:
            self._handle_error("fetch latest SOAP record", e)


# ============================================================================
# Plan Service
# ============================================================================

class PlanService(BaseDatabaseService):
    """Service for plan operations."""
    
    def create(
        self,
        user_id: str,
        patient_id: str,
        title: str = "精神科訪問看護計画書",
        start_date: str = "",
        end_date: str = "",
        long_term_goal: Optional[str] = None,
        short_term_goal: Optional[str] = None,
        nursing_policy: Optional[str] = None,
        patient_family_wish: Optional[str] = None,
        has_procedure: bool = False,
        procedure_content: Optional[str] = None,
        material_details: Optional[str] = None,
        material_amount: Optional[str] = None,
        procedure_note: Optional[str] = None,
        items: Optional[list[Dict[str, Any]]] = None,
        evaluations: Optional[list[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Create a new plan with default items and evaluations."""
        try:
            patient_service = PatientService()
            soap_service = SOAPRecordService()
            
            # Prefill patient_family_wish from patient's individual_notes if empty
            if not patient_family_wish:
                try:
                    patient = patient_service.get_by_id(patient_id, user_id)
                    patient_family_wish = patient.get("individual_notes")
                except DatabaseServiceError:
                    logger.warning(f"Could not fetch patient {patient_id} for prefilling wish")
            
            # Fetch latest SOAP record once for both plan fields and plan_items
            latest_record = None
            plan_output = None
            if not long_term_goal or not short_term_goal or not nursing_policy or items is None:
                try:
                    latest_record = soap_service.get_latest_for_patient(patient_id, user_id)
                    if latest_record and latest_record.get("plan_output"):
                        plan_output = latest_record.get("plan_output", {})
                except Exception as e:
                    logger.warning(f"Could not fetch plan_output from latest SOAP record: {e}")
            
            # Prefill long_term_goal, short_term_goal, nursing_policy from latest SOAP record's plan_output if empty
            if plan_output:
                # Map plan_output fields (Japanese keys) to plan fields
                if not long_term_goal:
                    long_term_goal = plan_output.get("長期目標", "").strip() or None
                if not short_term_goal:
                    short_term_goal = plan_output.get("短期目標", "").strip() or None
                if not nursing_policy:
                    nursing_policy = plan_output.get("看護援助の方針", "").strip() or None
                
                if long_term_goal or short_term_goal or nursing_policy:
                    logger.info(f"Prefilled plan fields from latest SOAP record plan_output")
            
            plan_data = {
                "user_id": user_id,
                "patient_id": patient_id,
                "title": title.strip() if title else "精神科訪問看護計画書",
                "start_date": start_date,
                "end_date": end_date,
                "has_procedure": has_procedure,
            }
            
            # Optional fields
            optional_fields = {
                "long_term_goal": long_term_goal,
                "short_term_goal": short_term_goal,
                "nursing_policy": nursing_policy,
                "patient_family_wish": patient_family_wish,
                "procedure_content": procedure_content,
                "material_details": material_details,
                "material_amount": material_amount,
                "procedure_note": procedure_note,
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    if isinstance(value, str):
                        plan_data[field] = value.strip() if value else None
                    else:
                        plan_data[field] = value
            
            logger.info(f"Creating plan for user {user_id}, patient {patient_id}")
            
            # Create plan
            response = self.client.table("plans").insert(plan_data).execute()
            
            if not response.data:
                raise DatabaseServiceError("Failed to create plan: No data returned")
            
            plan = response.data[0]
            plan_id = plan["id"]
            
            # Create default plan items if not provided
            if items is None:
                items = []
                if plan_output:
                    # Map plan_output fields to plan_items
                    long_term = plan_output.get("長期目標", "").strip()
                    short_term = plan_output.get("短期目標", "").strip()
                    policy = plan_output.get("看護援助の方針", "").strip()
                    
                    if long_term:
                        items.append({
                            "item_key": "LONG_TERM",
                            "label": "看護の目標",
                            "observation_text": "",
                            "assistance_text": long_term,
                            "sort_order": 1
                        })
                    if short_term:
                        items.append({
                            "item_key": "SHORT_TERM",
                            "label": "短期目標",
                            "observation_text": "",
                            "assistance_text": short_term,
                            "sort_order": 2
                        })
                    if policy:
                        items.append({
                            "item_key": "POLICY",
                            "label": "看護援助の方針",
                            "observation_text": "",
                            "assistance_text": policy,
                            "sort_order": 3
                        })
                    
                    if items:
                        logger.info(f"Populated {len(items)} plan items from latest SOAP record plan_output")
                
                # If no items were populated from SOAP record, use defaults
                if not items:
                    default_items = [
                        {"item_key": "LONG_TERM", "label": "看護の目標", "sort_order": 1},
                        {"item_key": "SHORT_TERM", "label": "短期目標", "sort_order": 2},
                        {"item_key": "POLICY", "label": "看護援助の方針", "sort_order": 3},
                        {"item_key": "SPECIFIC_CONTENT", "label": "具体的な援助内容", "sort_order": 4},
                        {"item_key": "LIFE_RHYTHM", "label": "生活リズム", "sort_order": 5},
                    ]
                    items = default_items
            
            # Insert plan items
            plan_items_data = []
            for item in items:
                item_data = {
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "item_key": item.get("item_key", ""),
                    "label": item.get("label", ""),
                    "observation_text": item.get("observation_text"),
                    "assistance_text": item.get("assistance_text"),
                    "sort_order": item.get("sort_order", 0),
                }
                plan_items_data.append(item_data)
            
            if plan_items_data:
                self.client.table("plan_items").insert(plan_items_data).execute()
            
            # Create default evaluations if not provided (2 slots: +3 months, +6 months)
            if evaluations is None:
                from datetime import datetime, timedelta
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                eval1_date = (start_dt + timedelta(days=90)).strftime("%Y-%m-%d")
                eval2_date = (start_dt + timedelta(days=180)).strftime("%Y-%m-%d")
                
                evaluations = [
                    {"evaluation_slot": 1, "evaluation_date": eval1_date, "result": "NONE"},
                    {"evaluation_slot": 2, "evaluation_date": eval2_date, "result": "NONE"},
                ]
            
            # Insert evaluations
            plan_evaluations_data = []
            for eval_item in evaluations:
                eval_data = {
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "evaluation_slot": eval_item.get("evaluation_slot"),
                    "evaluation_date": eval_item.get("evaluation_date"),
                    "result": eval_item.get("result", "NONE"),
                    "note": eval_item.get("note"),
                }
                plan_evaluations_data.append(eval_data)
            
            if plan_evaluations_data:
                self.client.table("plan_evaluations").insert(plan_evaluations_data).execute()
            
            logger.info(f"Successfully created plan with ID: {plan_id}")
            
            # Fetch complete plan with items and evaluations
            return self.get_by_id(plan_id, user_id)
            
        except DatabaseServiceError:
            raise
        except Exception as e:
            self._handle_error("create plan", e)
    
    def get_by_patient(self, patient_id: str, user_id: str, status: Optional[str] = None) -> list[Dict[str, Any]]:
        """Fetch all plans for a specific patient."""
        try:
            logger.info(f"Fetching plans for patient {patient_id}, user {user_id}, status={status}")
            
            query = (
                self.client.table("plans")
                .select("*")
                .eq("patient_id", patient_id)
                .eq("user_id", user_id)
            )
            
            if status:
                query = query.eq("status", status)
            
            response = (
                query
                .order("start_date", desc=True)
                .execute()
            )
            
            if not response.data:
                logger.info(f"No plans found for patient {patient_id}")
                return []
            
            # Fetch items and evaluations for each plan
            plans = []
            for plan in response.data:
                plan_id = plan["id"]
                
                # Fetch items
                items_response = (
                    self.client.table("plan_items")
                    .select("*")
                    .eq("plan_id", plan_id)
                    .eq("user_id", user_id)
                    .order("sort_order")
                    .execute()
                )
                plan["items"] = items_response.data if items_response.data else []
                
                # Fetch evaluations
                evaluations_response = (
                    self.client.table("plan_evaluations")
                    .select("*")
                    .eq("plan_id", plan_id)
                    .eq("user_id", user_id)
                    .order("evaluation_slot")
                    .execute()
                )
                plan["evaluations"] = evaluations_response.data if evaluations_response.data else []
                
                # Fetch hospitalizations
                hospitalizations_response = (
                    self.client.table("plan_hospitalizations")
                    .select("*")
                    .eq("plan_id", plan_id)
                    .eq("user_id", user_id)
                    .order("hospitalized_at", desc=True)
                    .execute()
                )
                plan["hospitalizations"] = hospitalizations_response.data if hospitalizations_response.data else []
                
                plans.append(plan)
            
            logger.info(f"Successfully fetched {len(plans)} plans for patient {patient_id}")
            return plans
            
        except Exception as e:
            self._handle_error("fetch plans", e)
    
    def get_by_id(self, plan_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch a single plan by ID with items and evaluations."""
        try:
            logger.info(f"Fetching plan {plan_id} for user {user_id}")
            
            response = (
                self.client.table("plans")
                .select("*")
                .eq("id", plan_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            if not response.data:
                raise DatabaseServiceError(f"Plan {plan_id} not found")
            
            plan = response.data
            
            # Fetch items
            items_response = (
                self.client.table("plan_items")
                .select("*")
                .eq("plan_id", plan_id)
                .eq("user_id", user_id)
                .order("sort_order")
                .execute()
            )
            plan["items"] = items_response.data if items_response.data else []
            
            # Fetch evaluations
            evaluations_response = (
                self.client.table("plan_evaluations")
                .select("*")
                .eq("plan_id", plan_id)
                .eq("user_id", user_id)
                .order("evaluation_slot")
                .execute()
            )
            plan["evaluations"] = evaluations_response.data if evaluations_response.data else []
            
            # Fetch hospitalizations
            hospitalizations_response = (
                self.client.table("plan_hospitalizations")
                .select("*")
                .eq("plan_id", plan_id)
                .eq("user_id", user_id)
                .order("hospitalized_at", desc=True)
                .execute()
            )
            plan["hospitalizations"] = hospitalizations_response.data if hospitalizations_response.data else []
            
            logger.info(f"Successfully fetched plan {plan_id}")
            return plan
            
        except Exception as e:
            self._handle_error("fetch plan", e)
    
    def update(
        self,
        plan_id: str,
        user_id: str,
        title: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        long_term_goal: Optional[str] = None,
        short_term_goal: Optional[str] = None,
        nursing_policy: Optional[str] = None,
        patient_family_wish: Optional[str] = None,
        has_procedure: Optional[bool] = None,
        procedure_content: Optional[str] = None,
        material_details: Optional[str] = None,
        material_amount: Optional[str] = None,
        procedure_note: Optional[str] = None,
        status: Optional[str] = None,
        items: Optional[list[Dict[str, Any]]] = None,
        evaluations: Optional[list[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Update a plan and optionally upsert items and evaluations."""
        try:
            # Verify plan exists and belongs to user
            self.get_by_id(plan_id, user_id)
            
            # Build update data
            update_data = {}
            optional_fields = {
                "title": title,
                "start_date": start_date,
                "end_date": end_date,
                "long_term_goal": long_term_goal,
                "short_term_goal": short_term_goal,
                "nursing_policy": nursing_policy,
                "patient_family_wish": patient_family_wish,
                "has_procedure": has_procedure,
                "procedure_content": procedure_content,
                "material_details": material_details,
                "material_amount": material_amount,
                "procedure_note": procedure_note,
                "status": status,
            }
            
            for field, value in optional_fields.items():
                if value is not None:
                    if isinstance(value, str):
                        update_data[field] = value.strip() if value else None
                    else:
                        update_data[field] = value
            
            if update_data:
                self.client.table("plans").update(update_data).eq("id", plan_id).eq("user_id", user_id).execute()
            
            # Upsert items if provided
            if items is not None:
                for item in items:
                    item_id = item.get("id")
                    item_key = item.get("item_key")
                    
                    item_data = {
                        "user_id": user_id,
                        "plan_id": plan_id,
                        "item_key": item_key,
                        "label": item.get("label", ""),
                        "observation_text": item.get("observation_text"),
                        "assistance_text": item.get("assistance_text"),
                        "sort_order": item.get("sort_order", 0),
                    }
                    
                    if item_id:
                        # Update existing item
                        self.client.table("plan_items").update(item_data).eq("id", item_id).eq("user_id", user_id).execute()
                    elif item_key:
                        # Try to find existing by item_key
                        existing = (
                            self.client.table("plan_items")
                            .select("id")
                            .eq("plan_id", plan_id)
                            .eq("item_key", item_key)
                            .eq("user_id", user_id)
                            .single()
                            .execute()
                        )
                        if existing.data:
                            self.client.table("plan_items").update(item_data).eq("id", existing.data["id"]).execute()
                        else:
                            self.client.table("plan_items").insert(item_data).execute()
                    else:
                        # Insert new item
                        self.client.table("plan_items").insert(item_data).execute()
            
            # Upsert evaluations if provided
            if evaluations is not None:
                for eval_item in evaluations:
                    eval_id = eval_item.get("id")
                    eval_slot = eval_item.get("evaluation_slot")
                    
                    eval_data = {
                        "user_id": user_id,
                        "plan_id": plan_id,
                        "evaluation_slot": eval_slot,
                        "evaluation_date": eval_item.get("evaluation_date"),
                        "result": eval_item.get("result", "NONE"),
                        "note": eval_item.get("note"),
                    }
                    
                    if eval_id:
                        # Update existing evaluation
                        self.client.table("plan_evaluations").update(eval_data).eq("id", eval_id).eq("user_id", user_id).execute()
                    elif eval_slot is not None:
                        # Try to find existing by slot
                        existing = (
                            self.client.table("plan_evaluations")
                            .select("id")
                            .eq("plan_id", plan_id)
                            .eq("evaluation_slot", eval_slot)
                            .eq("user_id", user_id)
                            .single()
                            .execute()
                        )
                        if existing.data:
                            self.client.table("plan_evaluations").update(eval_data).eq("id", existing.data["id"]).execute()
                        else:
                            self.client.table("plan_evaluations").insert(eval_data).execute()
            
            logger.info(f"Successfully updated plan {plan_id}")
            
            # Return updated plan
            return self.get_by_id(plan_id, user_id)
            
        except DatabaseServiceError:
            raise
        except Exception as e:
            self._handle_error("update plan", e)
    
    def delete(self, plan_id: str, user_id: str) -> None:
        """Delete a plan record."""
        try:
            logger.info(f"Deleting plan {plan_id} for user {user_id}")
            
            # Verify plan exists and belongs to user
            self.get_by_id(plan_id, user_id)
            
            # Delete plan (CASCADE will handle related records)
            response = (
                self.client.table("plans")
                .delete()
                .eq("id", plan_id)
                .eq("user_id", user_id)
                .execute()
            )
            
            logger.info(f"Successfully deleted plan {plan_id}")
            
        except DatabaseServiceError:
            raise
        except Exception as e:
            self._handle_error("delete plan", e)
    
    def create_hospitalization(
        self,
        plan_id: str,
        user_id: str,
        hospitalized_at: str,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a hospitalization record and close the plan."""
        try:
            # Verify plan exists and belongs to user
            self.get_by_id(plan_id, user_id)
            
            # Create hospitalization record
            hospitalization_data = {
                "user_id": user_id,
                "plan_id": plan_id,
                "hospitalized_at": hospitalized_at,
                "note": note.strip() if note else None,
            }
            
            response = self.client.table("plan_hospitalizations").insert(hospitalization_data).execute()
            
            if not response.data:
                raise DatabaseServiceError("Failed to create hospitalization: No data returned")
            
            # Update plan status
            from datetime import datetime
            self.client.table("plans").update({
                "status": "ENDED_BY_HOSPITALIZATION",
                "closed_at": datetime.now().isoformat(),
                "closed_reason": "HOSPITALIZATION",
            }).eq("id", plan_id).eq("user_id", user_id).execute()
            
            logger.info(f"Successfully created hospitalization for plan {plan_id}")
            return response.data[0]
            
        except DatabaseServiceError:
            raise
        except Exception as e:
            self._handle_error("create hospitalization", e)
    
    def get_soap_records_for_plan(self, plan_id: str, user_id: str) -> list[Dict[str, Any]]:
        """Fetch SOAP records for a plan's patient within the plan's date range."""
        try:
            # Get plan to find patient_id and date range
            plan = self.get_by_id(plan_id, user_id)
            patient_id = plan["patient_id"]
            start_date = plan["start_date"]
            end_date = plan["end_date"]
            
            # Fetch SOAP records
            soap_service = SOAPRecordService()
            return soap_service.get_all(
                user_id=user_id,
                patient_id=patient_id,
                date_from=start_date,
                date_to=end_date,
                limit=None,
            )
            
        except DatabaseServiceError:
            raise
        except Exception as e:
            self._handle_error("fetch SOAP records for plan", e)


# ============================================================================
# Service Instances (Singleton pattern)
# ============================================================================

_patient_service: Optional[PatientService] = None
_care_plan_service: Optional[CarePlanService] = None
_soap_record_service: Optional[SOAPRecordService] = None
_plan_service: Optional[PlanService] = None


def _get_patient_service() -> PatientService:
    """Get singleton PatientService instance."""
    global _patient_service
    if _patient_service is None:
        _patient_service = PatientService()
    return _patient_service


def _get_care_plan_service() -> CarePlanService:
    """Get singleton CarePlanService instance."""
    global _care_plan_service
    if _care_plan_service is None:
        _care_plan_service = CarePlanService()
    return _care_plan_service


def _get_soap_record_service() -> SOAPRecordService:
    """Get singleton SOAPRecordService instance."""
    global _soap_record_service
    if _soap_record_service is None:
        _soap_record_service = SOAPRecordService()
    return _soap_record_service


def _get_plan_service() -> PlanService:
    """Get singleton PlanService instance."""
    global _plan_service
    if _plan_service is None:
        _plan_service = PlanService()
    return _plan_service


# ============================================================================
# Backward Compatibility: Module-level Functions
# ============================================================================
# These functions maintain backward compatibility with existing code

# Patient Operations
def create_patient(*args, **kwargs) -> Dict[str, Any]:
    """Create a new patient record."""
    return _get_patient_service().create(*args, **kwargs)


def get_patients(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch all patients for a specific user."""
    return _get_patient_service().get_all(*args, **kwargs)


def get_patient_by_id(*args, **kwargs) -> Dict[str, Any]:
    """Fetch a single patient by ID for a specific user."""
    return _get_patient_service().get_by_id(*args, **kwargs)


def update_patient(*args, **kwargs) -> Dict[str, Any]:
    """Update a patient record."""
    return _get_patient_service().update(*args, **kwargs)


def delete_patient(*args, **kwargs) -> None:
    """Delete a patient record."""
    return _get_patient_service().delete(*args, **kwargs)


# Care Plan Operations
def create_care_plan(*args, **kwargs) -> Dict[str, Any]:
    """Create a new care plan for a patient."""
    return _get_care_plan_service().create(*args, **kwargs)


def get_care_plans_by_patient(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch all care plans for a specific patient."""
    return _get_care_plan_service().get_by_patient(*args, **kwargs)


# SOAP Record Operations
def save_soap_record(*args, **kwargs) -> Dict[str, Any]:
    """Save SOAP record to Supabase database."""
    return _get_soap_record_service().save(*args, **kwargs)


def get_soap_records(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch SOAP records for a specific user."""
    return _get_soap_record_service().get_all(*args, **kwargs)


def get_soap_record_by_id(*args, **kwargs) -> Dict[str, Any]:
    """Fetch a single SOAP record by ID."""
    return _get_soap_record_service().get_by_id(*args, **kwargs)


def get_visits_by_patient_and_month(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch SOAP records for a specific patient in a specific month."""
    return _get_soap_record_service().get_by_patient_and_month(*args, **kwargs)


def update_soap_record(*args, **kwargs) -> Dict[str, Any]:
    """Update a SOAP record."""
    return _get_soap_record_service().update(*args, **kwargs)


def get_latest_soap_record_for_patient(*args, **kwargs) -> Optional[Dict[str, Any]]:
    """Fetch the latest SOAP record for a specific patient."""
    return _get_soap_record_service().get_latest_for_patient(*args, **kwargs)


# Plan Operations
def create_plan(*args, **kwargs) -> Dict[str, Any]:
    """Create a new plan with default items and evaluations."""
    return _get_plan_service().create(*args, **kwargs)


def get_plans_by_patient(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch all plans for a specific patient."""
    return _get_plan_service().get_by_patient(*args, **kwargs)


def get_plan_by_id(*args, **kwargs) -> Dict[str, Any]:
    """Fetch a single plan by ID with items and evaluations."""
    return _get_plan_service().get_by_id(*args, **kwargs)


def update_plan(*args, **kwargs) -> Dict[str, Any]:
    """Update a plan and optionally upsert items and evaluations."""
    return _get_plan_service().update(*args, **kwargs)


def delete_plan(*args, **kwargs) -> None:
    """Delete a plan record."""
    return _get_plan_service().delete(*args, **kwargs)


def create_plan_hospitalization(*args, **kwargs) -> Dict[str, Any]:
    """Create a hospitalization record and close the plan."""
    return _get_plan_service().create_hospitalization(*args, **kwargs)


def get_soap_records_for_plan(*args, **kwargs) -> list[Dict[str, Any]]:
    """Fetch SOAP records for a plan's patient within the plan's date range."""
    return _get_plan_service().get_soap_records_for_plan(*args, **kwargs)
