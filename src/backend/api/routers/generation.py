"""SOAP note generation routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse

from api.dependencies import get_ai_service_dependency, get_current_user
from models import ErrorResponse, GenerateRequest
from prompt_builder import build_prompt
from services.ai_service import AIService, AIServiceError
from services.database_service import DatabaseServiceError, get_patient_by_id, save_soap_record
from utils.response_parser import parse_soap_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_class=PlainTextResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
        502: {"model": ErrorResponse, "description": "AI service error"},
    },
    tags=["generation"],
    summary="Generate SOAP note and care plan",
    description="Generate SOAP summary and nursing care plan from input data.",
)
async def generate_note(
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service_dependency),
) -> str:
    """
    Generate SOAP note and care plan from input data.
    
    Requires authentication via Supabase JWT token.
    
    Returns plain text response with SOAP format and nursing care plan.
    """
    # Determine patient information
    patient_id = request.patient_id
    patient_name = request.userName.strip()
    diagnosis = request.diagnosis.strip()
    
    # If patient_id is provided, fetch patient data
    if patient_id:
        try:
            patient_data = get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
            patient_name = patient_data["name"]
            diagnosis = patient_data.get("primary_diagnosis") or diagnosis
        except DatabaseServiceError as db_exc:
            raise HTTPException(
                status_code=404,
                detail=f"指定された利用者（ID: {patient_id}）が見つかりませんでした。",
            ) from db_exc
    else:
        # Backward compatibility: validate userName and diagnosis if patient_id not provided
        if not patient_name:
            raise HTTPException(
                status_code=400,
                detail="利用者名は必須です（patient_idが指定されていない場合）。",
            )
        if not diagnosis:
            raise HTTPException(
                status_code=400,
                detail="主疾患は必須です（patient_idが指定されていない場合）。",
            )
    
    # Validate required fields
    if not request.visitDate.strip():
        raise HTTPException(
            status_code=400,
            detail="訪問日は必須です。",
        )
    if not request.startTime.strip() or not request.endTime.strip():
        raise HTTPException(
            status_code=400,
            detail="訪問時間（開始・終了）は必須です。",
        )
    if not request.sText.strip() and not request.oText.strip():
        raise HTTPException(
            status_code=400,
            detail="SまたはOのいずれか一方は必須です。",
        )

    # Build prompt with all fields
    try:
        prompt = build_prompt(
            user_name=patient_name,
            diagnosis=diagnosis,
            nurses=request.nurses,
            visit_date=request.visitDate,
            start_time=request.startTime,
            end_time=request.endTime,
            chief_complaint=request.chiefComplaint,
            s_text=request.sText,
            o_text=request.oText,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"日付形式が不正です: {exc}",
        ) from exc

    # Generate output
    try:
        output = ai_service.generate_output(prompt)
        
        # Parse the output to structured format
        parsed_data = parse_soap_response(output)
        # Save to database after successful generation
        try:
            save_soap_record(
                user_id=current_user["user_id"],
                patient_id=patient_id,
                patient_name=patient_name if not patient_id else None,  # Only include for backward compatibility
                diagnosis=diagnosis if not patient_id else None,  # Only include for backward compatibility
                visit_date=request.visitDate.strip(),
                start_time=request.startTime.strip(),
                end_time=request.endTime.strip(),
                nurses=request.nurses,
                chief_complaint=request.chiefComplaint.strip(),
                s_text=request.sText,
                o_text=request.oText,
                soap_output=parsed_data["soap"],
                plan_output=parsed_data["plan"],
            )
            logger.info(f"Successfully saved SOAP record for user {current_user['user_id']}, patient_id={patient_id}")
        except DatabaseServiceError as db_exc:
            # Log error but don't fail the request - generation was successful
            logger.error(f"Failed to save to database: {db_exc}")
            # Continue - user still gets the generated output
        
        return output
    except AIServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail="AI生成中にエラーが発生しました。",
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail="AI生成中にエラーが発生しました。",
        ) from exc

