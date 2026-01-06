"""Care plan CRUD routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from api.dependencies import get_current_user
from models import CarePlanCreateRequest, CarePlanResponse, CarePlansListResponse, ErrorResponse
from services.database_service import DatabaseServiceError, create_care_plan, get_care_plans_by_patient

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/care-plans",
    response_model=CarePlanResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["care-plans"],
    summary="Create a new care plan",
    description="Create a new care plan for a patient.",
)
async def create_care_plan_endpoint(
    request: CarePlanCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> CarePlanResponse:
    """
    Create a new care plan for a patient.
    
    Requires authentication via Supabase JWT token.
    
    Returns the created care plan data.
    """
    try:
        care_plan_data = create_care_plan(
            user_id=current_user["user_id"],
            patient_id=request.patient_id,
            plan_output=request.plan_output,
            start_date=request.start_date,
            end_date=request.end_date,
            status=request.status,
            notes=request.notes,
        )
        
        return CarePlanResponse(
            id=str(care_plan_data["id"]),
            patient_id=str(care_plan_data["patient_id"]),
            plan_output=care_plan_data["plan_output"],
            start_date=str(care_plan_data["start_date"]) if care_plan_data.get("start_date") else None,
            end_date=str(care_plan_data["end_date"]) if care_plan_data.get("end_date") else None,
            status=care_plan_data["status"],
            notes=care_plan_data.get("notes"),
            created_at=str(care_plan_data["created_at"]),
            updated_at=str(care_plan_data["updated_at"]),
        )
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error creating care plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="看護計画の作成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error creating care plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="看護計画の作成中にエラーが発生しました。",
        ) from exc


@router.get(
    "/patients/{patient_id}/care-plans",
    response_model=CarePlansListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["care-plans"],
    summary="Get care plans for a patient",
    description="Fetch all care plans for a specific patient.",
)
async def get_care_plans_endpoint(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    status: str | None = Query(None, description="Filter by status (active/inactive/completed)"),
) -> CarePlansListResponse:
    """
    Fetch all care plans for a specific patient.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameter:
    - status: Filter care plans by status (active/inactive/completed)
    
    Returns list of care plans ordered by start_date DESC.
    """
    try:
        care_plans_data = get_care_plans_by_patient(
            user_id=current_user["user_id"],
            patient_id=patient_id,
            status=status,
        )
        
        care_plans = [
            CarePlanResponse(
                id=str(cp["id"]),
                patient_id=str(cp["patient_id"]),
                plan_output=cp["plan_output"],
                start_date=str(cp["start_date"]) if cp.get("start_date") else None,
                end_date=str(cp["end_date"]) if cp.get("end_date") else None,
                status=cp["status"],
                notes=cp.get("notes"),
                created_at=str(cp["created_at"]),
                updated_at=str(cp["updated_at"]),
            )
            for cp in care_plans_data
        ]
        
        return CarePlansListResponse(care_plans=care_plans)
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error fetching care plans: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="看護計画の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching care plans: {exc}")
        raise HTTPException(
            status_code=500,
            detail="看護計画の取得中にエラーが発生しました。",
        ) from exc

