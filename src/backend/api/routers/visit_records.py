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
    description="Create a new visit record (訪問記録) with visit-specific information. Patient information is stored in the patients table.",
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
            visit_date=request.visit_date,
            visit_start_hour=request.visit_start_hour,
            visit_start_minute=request.visit_start_minute,
            visit_end_hour=request.visit_end_hour,
            visit_end_minute=request.visit_end_minute,
            daily_life_meal_nutrition=request.daily_life_meal_nutrition,
            daily_life_hygiene=request.daily_life_hygiene,
            daily_life_medication=request.daily_life_medication,
            daily_life_sleep=request.daily_life_sleep,
            daily_life_living_environment=request.daily_life_living_environment,
            daily_life_family_environment=request.daily_life_family_environment,
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
        # Build update dict from request (only visit-specific fields)
        update_kwargs = {}
        if request.patient_id is not None:
            update_kwargs["patient_id"] = request.patient_id
        if request.visit_date is not None:
            update_kwargs["visit_date"] = request.visit_date
        if request.visit_start_hour is not None:
            update_kwargs["visit_start_hour"] = request.visit_start_hour
        if request.visit_start_minute is not None:
            update_kwargs["visit_start_minute"] = request.visit_start_minute
        if request.visit_end_hour is not None:
            update_kwargs["visit_end_hour"] = request.visit_end_hour
        if request.visit_end_minute is not None:
            update_kwargs["visit_end_minute"] = request.visit_end_minute
        if request.daily_life_meal_nutrition is not None:
            update_kwargs["daily_life_meal_nutrition"] = request.daily_life_meal_nutrition
        if request.daily_life_hygiene is not None:
            update_kwargs["daily_life_hygiene"] = request.daily_life_hygiene
        if request.daily_life_medication is not None:
            update_kwargs["daily_life_medication"] = request.daily_life_medication
        if request.daily_life_sleep is not None:
            update_kwargs["daily_life_sleep"] = request.daily_life_sleep
        if request.daily_life_living_environment is not None:
            update_kwargs["daily_life_living_environment"] = request.daily_life_living_environment
        if request.daily_life_family_environment is not None:
            update_kwargs["daily_life_family_environment"] = request.daily_life_family_environment
        if request.notes is not None:
            update_kwargs["notes"] = request.notes
        if request.recorder_name is not None:
            update_kwargs["recorder_name"] = request.recorder_name
        if request.status is not None:
            update_kwargs["status"] = request.status
        
        updated_visit_record = update_visit_record(
            visit_record_id=visit_record_id,
            user_id=current_user["user_id"],
            **update_kwargs
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
