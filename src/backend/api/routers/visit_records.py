"""Visit Records CRUD routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.dependencies import get_current_user
from models import (
    ErrorResponse,
    VisitRecordCreateRequest,
    VisitRecordResponse,
    VisitRecordUpdateRequest,
    VisitRecordsListResponse,
)
from services.database_service import (
    DatabaseServiceError,
    create_visit_record,
    delete_visit_record,
    get_visit_record_by_id,
    get_visit_records,
    update_visit_record,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/visit-records",
    response_model=VisitRecordResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["visit-records"],
    summary="Create a new visit record",
    description="Create a new visit record (訪問記録) with detailed patient information.",
)
async def create_visit_record_endpoint(
    request: VisitRecordCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> VisitRecordResponse:
    """
    Create a new visit record.
    
    Requires authentication via Supabase JWT token.
    
    Returns the created visit record data.
    """
    try:
        visit_record_data = create_visit_record(
            user_id=current_user["user_id"],
            patient_id=request.patient_id,
            patient_name=request.patient_name,
            gender=request.gender,
            birth_date=request.birth_date,
            birth_date_year=request.birth_date_year,
            birth_date_month=request.birth_date_month,
            birth_date_day=request.birth_date_day,
            age=request.age,
            patient_address=request.patient_address,
            patient_contact=request.patient_contact,
            key_person_name=request.key_person_name,
            key_person_relationship=request.key_person_relationship,
            key_person_address=request.key_person_address,
            key_person_contact1=request.key_person_contact1,
            key_person_contact2=request.key_person_contact2,
            initial_visit_date=request.initial_visit_date,
            initial_visit_year=request.initial_visit_year,
            initial_visit_month=request.initial_visit_month,
            initial_visit_day=request.initial_visit_day,
            initial_visit_day_of_week=request.initial_visit_day_of_week,
            initial_visit_start_hour=request.initial_visit_start_hour,
            initial_visit_start_minute=request.initial_visit_start_minute,
            initial_visit_end_hour=request.initial_visit_end_hour,
            initial_visit_end_minute=request.initial_visit_end_minute,
            main_disease=request.main_disease,
            medical_history=request.medical_history,
            current_illness_history=request.current_illness_history,
            family_structure=request.family_structure,
            daily_life_meal_nutrition=request.daily_life_meal_nutrition,
            daily_life_hygiene=request.daily_life_hygiene,
            daily_life_medication=request.daily_life_medication,
            daily_life_sleep=request.daily_life_sleep,
            daily_life_living_environment=request.daily_life_living_environment,
            daily_life_family_environment=request.daily_life_family_environment,
            doctor_name=request.doctor_name,
            hospital_name=request.hospital_name,
            hospital_address=request.hospital_address,
            hospital_phone=request.hospital_phone,
            notes=request.notes,
            recorder_name=request.recorder_name,
            status=request.status,
        )
        
        return VisitRecordResponse(**visit_record_data)
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error creating visit record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の作成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error creating visit record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の作成中にエラーが発生しました。",
        ) from exc


@router.get(
    "/visit-records",
    response_model=VisitRecordsListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["visit-records"],
    summary="Get all visit records",
    description="Fetch all visit records (訪問記録) for the authenticated user with optional filters.",
)
async def get_visit_records_endpoint(
    current_user: dict = Depends(get_current_user),
    patient_id: str | None = Query(None, description="Filter by patient ID"),
    status: str | None = Query(None, description="Filter by status (active/inactive/archived)"),
) -> VisitRecordsListResponse:
    """
    Fetch all visit records for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameters:
    - patient_id: Filter visit records by patient ID
    - status: Filter visit records by status (active/inactive/archived)
    
    Returns list of visit records ordered by creation date (newest first).
    """
    try:
        visit_records_data = get_visit_records(
            user_id=current_user["user_id"],
            patient_id=patient_id,
            status=status,
        )
        
        visit_records = [VisitRecordResponse(**record) for record in visit_records_data]
        
        return VisitRecordsListResponse(visit_records=visit_records)
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error fetching visit records: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching visit records: {exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の取得中にエラーが発生しました。",
        ) from exc


@router.get(
    "/visit-records/{visit_record_id}",
    response_model=VisitRecordResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Visit record not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["visit-records"],
    summary="Get a single visit record",
    description="Fetch a single visit record (訪問記録) by ID.",
)
async def get_visit_record_endpoint(
    visit_record_id: str,
    current_user: dict = Depends(get_current_user),
) -> VisitRecordResponse:
    """
    Fetch a single visit record by ID for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns visit record data.
    """
    try:
        visit_record_data = get_visit_record_by_id(
            visit_record_id=visit_record_id,
            user_id=current_user["user_id"]
        )
        
        return VisitRecordResponse(**visit_record_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Visit record {visit_record_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="訪問記録が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching visit record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching visit record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の取得中にエラーが発生しました。",
        ) from exc


@router.patch(
    "/visit-records/{visit_record_id}",
    response_model=VisitRecordResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Visit record not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["visit-records"],
    summary="Update a visit record",
    description="Update a visit record (訪問記録).",
)
async def update_visit_record_endpoint(
    visit_record_id: str,
    request: VisitRecordUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> VisitRecordResponse:
    """
    Update a visit record for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns updated visit record data.
    """
    try:
        updated_visit_record = update_visit_record(
            visit_record_id=visit_record_id,
            user_id=current_user["user_id"],
            patient_id=request.patient_id,
            patient_name=request.patient_name,
            gender=request.gender,
            birth_date=request.birth_date,
            birth_date_year=request.birth_date_year,
            birth_date_month=request.birth_date_month,
            birth_date_day=request.birth_date_day,
            age=request.age,
            patient_address=request.patient_address,
            patient_contact=request.patient_contact,
            key_person_name=request.key_person_name,
            key_person_relationship=request.key_person_relationship,
            key_person_address=request.key_person_address,
            key_person_contact1=request.key_person_contact1,
            key_person_contact2=request.key_person_contact2,
            initial_visit_date=request.initial_visit_date,
            initial_visit_year=request.initial_visit_year,
            initial_visit_month=request.initial_visit_month,
            initial_visit_day=request.initial_visit_day,
            initial_visit_day_of_week=request.initial_visit_day_of_week,
            initial_visit_start_hour=request.initial_visit_start_hour,
            initial_visit_start_minute=request.initial_visit_start_minute,
            initial_visit_end_hour=request.initial_visit_end_hour,
            initial_visit_end_minute=request.initial_visit_end_minute,
            main_disease=request.main_disease,
            medical_history=request.medical_history,
            current_illness_history=request.current_illness_history,
            family_structure=request.family_structure,
            daily_life_meal_nutrition=request.daily_life_meal_nutrition,
            daily_life_hygiene=request.daily_life_hygiene,
            daily_life_medication=request.daily_life_medication,
            daily_life_sleep=request.daily_life_sleep,
            daily_life_living_environment=request.daily_life_living_environment,
            daily_life_family_environment=request.daily_life_family_environment,
            doctor_name=request.doctor_name,
            hospital_name=request.hospital_name,
            hospital_address=request.hospital_address,
            hospital_phone=request.hospital_phone,
            notes=request.notes,
            recorder_name=request.recorder_name,
            status=request.status,
        )
        
        return VisitRecordResponse(**updated_visit_record)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Visit record {visit_record_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="訪問記録が見つかりませんでした。",
            ) from db_exc
        if "Invalid status" in error_msg:
            logger.warning(f"Invalid status provided: {request.status}")
            raise HTTPException(
                status_code=400,
                detail=error_msg,
            ) from db_exc
        logger.error(f"Database error updating visit record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の更新中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error updating visit record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の更新中にエラーが発生しました。",
        ) from exc


@router.delete(
    "/visit-records/{visit_record_id}",
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Visit record not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["visit-records"],
    summary="Delete a visit record",
    description="Delete a visit record (訪問記録).",
)
async def delete_visit_record_endpoint(
    visit_record_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a visit record for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns 204 No Content on success.
    """
    try:
        delete_visit_record(
            visit_record_id=visit_record_id,
            user_id=current_user["user_id"]
        )
        
        return Response(status_code=204)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Visit record {visit_record_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="訪問記録が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error deleting visit record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の削除中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error deleting visit record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="訪問記録の削除中にエラーが発生しました。",
        ) from exc
