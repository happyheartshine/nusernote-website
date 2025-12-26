"""API routes for NurseNote AI backend."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, Response

from api.dependencies import get_ai_service_dependency, get_current_user
from models import ErrorResponse, FullSOAPRecordResponse, GenerateRequest, PDFGenerationResponse, RecordsListResponse, SOAPRecordResponse
from prompt_builder import build_prompt
from services.ai_service import AIService, AIServiceError
from services.database_service import DatabaseServiceError, get_soap_record_by_id, get_soap_records, get_visits_by_patient_and_month, save_soap_record
from services.pdf_service import PDFServiceError, generate_monthly_report_pdf, generate_visit_report_pdf
from services.s3_service import S3ServiceError, generate_presigned_url, upload_pdf_to_s3
from utils.response_parser import parse_soap_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/health",
    tags=["health"],
    summary="Health check endpoint",
    description="Returns the health status of the API.",
)
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


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
    # Validate required fields
    if not request.userName.strip():
        raise HTTPException(
            status_code=400,
            detail="利用者名は必須です。",
        )
    if not request.diagnosis.strip():
        raise HTTPException(
            status_code=400,
            detail="主疾患は必須です。",
        )
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
            user_name=request.userName,
            diagnosis=request.diagnosis,
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
        print(parsed_data)
        # Save to database after successful generation
        try:
            save_soap_record(
                user_id=current_user["user_id"],
                patient_name=request.userName.strip(),
                diagnosis=request.diagnosis.strip(),
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
            logger.info(f"Successfully saved SOAP record for user {current_user['user_id']}")
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


@router.get(
    "/records",
    response_model=RecordsListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["records"],
    summary="Get SOAP records",
    description="Fetch all SOAP records for the authenticated user.",
)
async def get_records(
    current_user: dict = Depends(get_current_user),
) -> RecordsListResponse:
    """
    Fetch SOAP records for the authenticated user.
    
    Requires authentication via Supabase JWT token.
    
    Returns list of SOAP records ordered by visit_date DESC.
    """
    try:
        records_data = get_soap_records(user_id=current_user["user_id"])
        
        # Convert database records to response format
        records = [
            SOAPRecordResponse(
                id=str(record["id"]),
                patient_name=record["patient_name"],
                visit_date=str(record["visit_date"]),
                chief_complaint=record.get("chief_complaint"),
                created_at=str(record["created_at"]),
                diagnosis=record.get("diagnosis"),
                start_time=str(record["start_time"]) if record.get("start_time") else None,
                end_time=str(record["end_time"]) if record.get("end_time") else None,
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


@router.post(
    "/pdf/visit-report/{visit_id}",
    response_class=Response,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Visit record not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["pdf"],
    summary="Generate visit report PDF",
    description="Generate 精神科訪問看護記録書Ⅱ PDF for a specific visit and return it directly.",
)
async def generate_visit_report_pdf_endpoint(
    visit_id: str,
    current_user: dict = Depends(get_current_user),
) -> Response:
    """
    Generate visit report PDF (精神科訪問看護記録書Ⅱ) for a specific visit.
    
    Requires authentication via Supabase JWT token.
    
    Returns the PDF file directly.
    """
    try:
        # Fetch visit record
        record_data = get_soap_record_by_id(record_id=visit_id, user_id=current_user["user_id"])
        
        # Generate PDF
        pdf_bytes = generate_visit_report_pdf(record_data)
        
        logger.info(f"Successfully generated visit report PDF for visit {visit_id}")
        
        # Return PDF directly with appropriate headers
        # Use Japanese-safe filename encoding
        filename = f"visit_report_{visit_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}; filename*=UTF-8''{filename}"
            }
        )
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Visit {visit_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="訪問記録が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error generating visit report PDF: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from db_exc
    except PDFServiceError as pdf_exc:
        logger.error(f"PDF service error generating visit report: {pdf_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from pdf_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error generating visit report PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from exc


@router.post(
    "/pdf/monthly-report/{patient_id}",
    response_model=PDFGenerationResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient records not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["pdf"],
    summary="Generate monthly report PDF",
    description="Generate monthly report PDF for a specific patient and upload to S3.",
)
async def generate_monthly_report_pdf_endpoint(
    patient_id: str,
    year: int = Query(..., description="Year (YYYY format)", ge=2000, le=2100),
    month: int = Query(..., description="Month (1-12)", ge=1, le=12),
    current_user: dict = Depends(get_current_user),
) -> PDFGenerationResponse:
    """
    Generate monthly report PDF for a specific patient.

    Requires authentication via Supabase JWT token.

    Query parameters:
    - year: Year (YYYY format)
    - month: Month (1-12)

    Returns presigned URL for downloading the PDF.
    """
    try:
        # Fetch visits for the month
        # Note: patient_id is actually patient_name in the current schema
        visits_data = get_visits_by_patient_and_month(
            user_id=current_user["user_id"],
            patient_name=patient_id,
            year=year,
            month=month,
        )

        if not visits_data:
            raise HTTPException(
                status_code=404,
                detail=f"{year}年{month}月の訪問記録が見つかりませんでした。",
            )

        # Get patient name from first visit
        patient_name = visits_data[0].get("patient_name", patient_id)

        # Generate PDF
        pdf_bytes = generate_monthly_report_pdf(
            patient_id=patient_id,
            patient_name=patient_name,
            month=f"{month:02d}",
            year=str(year),
            visits_data=visits_data,
        )

        # Upload to S3
        s3_key = f"pdf/monthly/{patient_id}_{year}{month:02d}.pdf"
        upload_pdf_to_s3(pdf_bytes, s3_key)

        # Generate presigned URL
        presigned_url = generate_presigned_url(s3_key)

        logger.info(f"Successfully generated monthly report PDF for patient {patient_id}, {year}-{month:02d}")

        return PDFGenerationResponse(
            pdf_url=presigned_url,
            s3_key=s3_key,
        )

    except HTTPException:
        raise
    except DatabaseServiceError as db_exc:
        logger.error(f"Database error generating monthly report PDF: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from db_exc
    except PDFServiceError as pdf_exc:
        logger.error(f"PDF service error generating monthly report: {pdf_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from pdf_exc
    except S3ServiceError as s3_exc:
        logger.error(f"S3 service error generating monthly report PDF: {s3_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDFアップロード中にエラーが発生しました。",
        ) from s3_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error generating monthly report PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from exc

