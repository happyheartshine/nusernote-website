"""SOAP records routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user
from models import ErrorResponse, FullSOAPRecordResponse, RecordsListResponse, SOAPRecordResponse, UpdateRecordRequest
from services.database_service import DatabaseServiceError, get_soap_record_by_id, get_soap_records, update_soap_record

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/records",
    response_model=RecordsListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["records"],
    summary="Get SOAP records",
    description="Fetch all SOAP records for the authenticated user with optional filters.",
)
async def get_records(
    current_user: dict = Depends(get_current_user),
    date_from: str | None = None,
    date_to: str | None = None,
    nurse_name: str | None = None,
    patient_id: str | None = None,
) -> RecordsListResponse:
    """
    Fetch SOAP records for the authenticated user with optional filtering.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameters:
    - date_from: Filter records from this date (YYYY-MM-DD format, inclusive)
    - date_to: Filter records to this date (YYYY-MM-DD format, inclusive)
    - nurse_name: Filter records by assigned nurse (exact match)
    - patient_id: Filter records by patient ID
    
    Returns list of SOAP records ordered by visit_date DESC.
    """
    try:
        records_data = get_soap_records(
            user_id=current_user["user_id"],
            date_from=date_from,
            date_to=date_to,
            nurse_name=nurse_name,
            patient_id=patient_id,
        )
        
        # Convert database records to response format
        records = [
            SOAPRecordResponse(
                id=str(record["id"]),
                patient_id=str(record["patient_id"]) if record.get("patient_id") else None,
                patient_name=record["patient_name"],
                visit_date=str(record["visit_date"]),
                chief_complaint=record.get("chief_complaint"),
                created_at=str(record["created_at"]),
                diagnosis=record.get("diagnosis"),
                start_time=str(record["start_time"]) if record.get("start_time") else None,
                end_time=str(record["end_time"]) if record.get("end_time") else None,
                plan_output=record.get("plan_output"),
                status=record.get("status", "draft"),
            )
            for record in records_data
        ]
        
        return RecordsListResponse(records=records)
        
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error fetching records: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching records: {exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の取得中にエラーが発生しました。",
        ) from exc


@router.get(
    "/records/{record_id}",
    response_model=FullSOAPRecordResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Record not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["records"],
    summary="Get single SOAP record",
    description="Fetch a single SOAP record by ID with full SOAP and Plan data.",
)
async def get_record(
    record_id: str,
    current_user: dict = Depends(get_current_user),
) -> FullSOAPRecordResponse:
    """
    Fetch a single SOAP record by ID for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns full SOAP record with soap_output and plan_output.
    """
    try:
        record_data = get_soap_record_by_id(record_id=record_id, user_id=current_user["user_id"])
        
        # Convert database record to response format
        record = FullSOAPRecordResponse(
            id=str(record_data["id"]),
            patient_id=str(record_data["patient_id"]) if record_data.get("patient_id") else None,
            patient_name=record_data["patient_name"],
            visit_date=str(record_data["visit_date"]),
            chief_complaint=record_data.get("chief_complaint"),
            created_at=str(record_data["created_at"]),
            diagnosis=record_data.get("diagnosis"),
            start_time=str(record_data["start_time"]) if record_data.get("start_time") else None,
            end_time=str(record_data["end_time"]) if record_data.get("end_time") else None,
            nurses=record_data.get("nurses", []),
            soap_output=record_data.get("soap_output", {}),
            plan_output=record_data.get("plan_output"),
            status=record_data.get("status", "draft"),
        )
        
        return record
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Record {record_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="記録が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の取得中にエラーが発生しました。",
        ) from exc


@router.patch(
    "/records/{record_id}",
    response_model=FullSOAPRecordResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Record not found"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["records"],
    summary="Update SOAP record",
    description="Update SOAP output, plan output, or status of a SOAP record.",
)
async def update_record(
    record_id: str,
    request: UpdateRecordRequest,
    current_user: dict = Depends(get_current_user),
) -> FullSOAPRecordResponse:
    """
    Update a SOAP record for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns updated SOAP record with soap_output and plan_output.
    """
    try:
        # Update the record
        updated_record = update_soap_record(
            record_id=record_id,
            user_id=current_user["user_id"],
            soap_output=request.soap_output,
            plan_output=request.plan_output,
            status=request.status,
        )
        
        # Convert database record to response format
        record = FullSOAPRecordResponse(
            id=str(updated_record["id"]),
            patient_id=str(updated_record["patient_id"]) if updated_record.get("patient_id") else None,
            patient_name=updated_record["patient_name"],
            visit_date=str(updated_record["visit_date"]),
            chief_complaint=updated_record.get("chief_complaint"),
            created_at=str(updated_record["created_at"]),
            diagnosis=updated_record.get("diagnosis"),
            start_time=str(updated_record["start_time"]) if updated_record.get("start_time") else None,
            end_time=str(updated_record["end_time"]) if updated_record.get("end_time") else None,
            nurses=updated_record.get("nurses", []),
            soap_output=updated_record.get("soap_output", {}),
            plan_output=updated_record.get("plan_output"),
            status=updated_record.get("status", "draft"),
        )
        
        return record
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Record {record_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="記録が見つかりませんでした。",
            ) from db_exc
        if "Invalid status" in error_msg:
            logger.warning(f"Invalid status provided: {request.status}")
            raise HTTPException(
                status_code=400,
                detail=error_msg,
            ) from db_exc
        logger.error(f"Database error updating record: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の更新中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error updating record: {exc}")
        raise HTTPException(
            status_code=500,
            detail="記録の更新中にエラーが発生しました。",
        ) from exc

