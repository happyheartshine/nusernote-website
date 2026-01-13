"""Patient CRUD routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.dependencies import get_current_user
from models import ErrorResponse, PatientCreateRequest, PatientResponse, PatientUpdateRequest, PatientsListResponse
from services.database_service import (
    DatabaseServiceError,
    create_patient,
    delete_patient,
    get_patient_by_id,
    get_patients,
    update_patient,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/patients",
    response_model=PatientResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["patients"],
    summary="Create a new patient",
    description="Create a new patient (利用者) record with baseline information.",
)
async def create_patient_endpoint(
    request: PatientCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> PatientResponse:
    """
    Create a new patient record.
    
    Requires authentication via Supabase JWT token.
    
    Returns the created patient data.
    """
    try:
        patient_data = create_patient(
            user_id=current_user["user_id"],
            name=request.name,
            age=request.age,
            gender=request.gender,
            primary_diagnosis=request.primary_diagnosis,
            individual_notes=request.individual_notes,
            status=request.status,
            birth_date=request.birth_date,
            birth_date_year=request.birth_date_year,
            birth_date_month=request.birth_date_month,
            birth_date_day=request.birth_date_day,
            address=request.address,
            contact=request.contact,
            key_person_name=request.key_person_name,
            key_person_relationship=request.key_person_relationship,
            key_person_address=request.key_person_address,
            key_person_contact1=request.key_person_contact1,
            key_person_contact2=request.key_person_contact2,
            medical_history=request.medical_history,
            current_illness_history=request.current_illness_history,
            family_structure=request.family_structure,
            doctor_name=request.doctor_name,
            hospital_name=request.hospital_name,
            hospital_address=request.hospital_address,
            hospital_phone=request.hospital_phone,
            initial_visit_date=request.initial_visit_date,
            initial_visit_year=request.initial_visit_year,
            initial_visit_month=request.initial_visit_month,
            initial_visit_day=request.initial_visit_day,
            initial_visit_day_of_week=request.initial_visit_day_of_week,
            initial_visit_start_hour=request.initial_visit_start_hour,
            initial_visit_start_minute=request.initial_visit_start_minute,
            initial_visit_end_hour=request.initial_visit_end_hour,
            initial_visit_end_minute=request.initial_visit_end_minute,
        )
        
        return PatientResponse(**{k: str(v) if k in ["id", "created_at", "updated_at"] or (k in ["birth_date", "initial_visit_date"] and v) else v for k, v in patient_data.items()})
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error creating patient: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の作成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error creating patient: {exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の作成中にエラーが発生しました。",
        ) from exc


@router.get(
    "/patients",
    response_model=PatientsListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["patients"],
    summary="Get all patients",
    description="Fetch all patients (利用者) for the authenticated user with optional status filter.",
)
async def get_patients_endpoint(
    current_user: dict = Depends(get_current_user),
    status: str | None = Query(None, description="Filter by status (active/inactive/archived)"),
) -> PatientsListResponse:
    """
    Fetch all patients for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameter:
    - status: Filter patients by status (active/inactive/archived)
    
    Returns list of patients ordered by name.
    """
    try:
        patients_data = get_patients(
            user_id=current_user["user_id"],
            status=status,
        )
        
        patients = [
            PatientResponse(**{k: str(v) if k in ["id", "created_at", "updated_at"] or (k in ["birth_date", "initial_visit_date"] and v) else v for k, v in patient.items()})
            for patient in patients_data
        ]
        
        return PatientsListResponse(patients=patients)
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error fetching patients: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching patients: {exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の取得中にエラーが発生しました。",
        ) from exc


@router.get(
    "/patients/{patient_id}",
    response_model=PatientResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["patients"],
    summary="Get a single patient",
    description="Fetch a single patient (利用者) by ID.",
)
async def get_patient_endpoint(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
) -> PatientResponse:
    """
    Fetch a single patient by ID for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns patient data.
    """
    try:
        patient_data = get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        return PatientResponse(**{k: str(v) if k in ["id", "created_at", "updated_at"] or (k in ["birth_date", "initial_visit_date"] and v) else v for k, v in patient_data.items()})
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching patient: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching patient: {exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の取得中にエラーが発生しました。",
        ) from exc


@router.patch(
    "/patients/{patient_id}",
    response_model=PatientResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["patients"],
    summary="Update a patient",
    description="Update a patient (利用者) record.",
)
async def update_patient_endpoint(
    patient_id: str,
    request: PatientUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> PatientResponse:
    """
    Update a patient record for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns updated patient data.
    """
    try:
        updated_patient = update_patient(
            patient_id=patient_id,
            user_id=current_user["user_id"],
            name=request.name,
            age=request.age,
            gender=request.gender,
            primary_diagnosis=request.primary_diagnosis,
            individual_notes=request.individual_notes,
            status=request.status,
            birth_date=request.birth_date,
            birth_date_year=request.birth_date_year,
            birth_date_month=request.birth_date_month,
            birth_date_day=request.birth_date_day,
            address=request.address,
            contact=request.contact,
            key_person_name=request.key_person_name,
            key_person_relationship=request.key_person_relationship,
            key_person_address=request.key_person_address,
            key_person_contact1=request.key_person_contact1,
            key_person_contact2=request.key_person_contact2,
            medical_history=request.medical_history,
            current_illness_history=request.current_illness_history,
            family_structure=request.family_structure,
            doctor_name=request.doctor_name,
            hospital_name=request.hospital_name,
            hospital_address=request.hospital_address,
            hospital_phone=request.hospital_phone,
            initial_visit_date=request.initial_visit_date,
            initial_visit_year=request.initial_visit_year,
            initial_visit_month=request.initial_visit_month,
            initial_visit_day=request.initial_visit_day,
            initial_visit_day_of_week=request.initial_visit_day_of_week,
            initial_visit_start_hour=request.initial_visit_start_hour,
            initial_visit_start_minute=request.initial_visit_start_minute,
            initial_visit_end_hour=request.initial_visit_end_hour,
            initial_visit_end_minute=request.initial_visit_end_minute,
        )
        
        return PatientResponse(**{k: str(v) if k in ["id", "created_at", "updated_at"] or (k in ["birth_date", "initial_visit_date"] and v) else v for k, v in updated_patient.items()})
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        if "Invalid status" in error_msg:
            logger.warning(f"Invalid status provided: {request.status}")
            raise HTTPException(
                status_code=400,
                detail=error_msg,
            ) from db_exc
        logger.error(f"Database error updating patient: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の更新中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error updating patient: {exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の更新中にエラーが発生しました。",
        ) from exc


@router.delete(
    "/patients/{patient_id}",
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["patients"],
    summary="Delete a patient",
    description="Delete a patient (利用者) record.",
)
async def delete_patient_endpoint(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a patient record for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns 204 No Content on success.
    """
    try:
        delete_patient(patient_id=patient_id, user_id=current_user["user_id"])
        
        return Response(status_code=204)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error deleting patient: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の削除中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error deleting patient: {exc}")
        raise HTTPException(
            status_code=500,
            detail="利用者の削除中にエラーが発生しました。",
        ) from exc

