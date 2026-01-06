"""API routes for NurseNote AI backend."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, Response

from api.dependencies import get_ai_service_dependency, get_current_user
from models import (
    CarePlanCreateRequest, CarePlanResponse, CarePlansListResponse,
    ErrorResponse, FullSOAPRecordResponse, GenerateRequest, PDFGenerationResponse,
    PatientCreateRequest, PatientResponse, PatientUpdateRequest, PatientsListResponse,
    RecordsListResponse, SOAPRecordResponse, UpdateRecordRequest
)
from prompt_builder import build_prompt
from services.ai_service import AIService, AIServiceError
from services.database_service import (
    DatabaseServiceError, create_care_plan, create_patient, delete_patient,
    get_care_plans_by_patient, get_patient_by_id, get_patients,
    get_soap_record_by_id, get_soap_records, get_visits_by_patient_and_month,
    save_soap_record, update_patient, update_soap_record
)
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


# ============================================================================
# Patient CRUD Endpoints
# ============================================================================

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
        )
        
        return PatientResponse(
            id=str(patient_data["id"]),
            name=patient_data["name"],
            age=patient_data.get("age"),
            gender=patient_data.get("gender"),
            primary_diagnosis=patient_data.get("primary_diagnosis"),
            individual_notes=patient_data.get("individual_notes"),
            status=patient_data["status"],
            created_at=str(patient_data["created_at"]),
            updated_at=str(patient_data["updated_at"]),
        )
        
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
            PatientResponse(
                id=str(patient["id"]),
                name=patient["name"],
                age=patient.get("age"),
                gender=patient.get("gender"),
                primary_diagnosis=patient.get("primary_diagnosis"),
                individual_notes=patient.get("individual_notes"),
                status=patient["status"],
                created_at=str(patient["created_at"]),
                updated_at=str(patient["updated_at"]),
            )
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
        
        return PatientResponse(
            id=str(patient_data["id"]),
            name=patient_data["name"],
            age=patient_data.get("age"),
            gender=patient_data.get("gender"),
            primary_diagnosis=patient_data.get("primary_diagnosis"),
            individual_notes=patient_data.get("individual_notes"),
            status=patient_data["status"],
            created_at=str(patient_data["created_at"]),
            updated_at=str(patient_data["updated_at"]),
        )
        
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
        )
        
        return PatientResponse(
            id=str(updated_patient["id"]),
            name=updated_patient["name"],
            age=updated_patient.get("age"),
            gender=updated_patient.get("gender"),
            primary_diagnosis=updated_patient.get("primary_diagnosis"),
            individual_notes=updated_patient.get("individual_notes"),
            status=updated_patient["status"],
            created_at=str(updated_patient["created_at"]),
            updated_at=str(updated_patient["updated_at"]),
        )
        
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


# ============================================================================
# Care Plan CRUD Endpoints
# ============================================================================

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

