"""PDF generation routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.dependencies import get_current_user
from models import ErrorResponse, PDFGenerationResponse
from services.database_service import DatabaseServiceError, get_soap_record_by_id, get_visits_by_patient_and_month, get_patient_by_id
from services.pdf_service import PDFServiceError, generate_monthly_report_pdf, generate_visit_report_pdf, generate_patient_record_pdf
from services.s3_service import S3ServiceError, generate_presigned_url, upload_pdf_to_s3

logger = logging.getLogger(__name__)

router = APIRouter()


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


@router.post(
    "/pdf/patient-record/{patient_id}",
    response_class=Response,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["pdf"],
    summary="Generate patient record PDF",
    description="Generate 精神科訪問看護記録書Ⅰ PDF for a specific patient and return it directly.",
)
async def generate_patient_record_pdf_endpoint(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
) -> Response:
    """
    Generate patient record PDF (精神科訪問看護記録書Ⅰ) for a specific patient.
    
    Requires authentication via Supabase JWT token.
    
    Returns the PDF file directly.
    """
    try:
        # Fetch patient data
        patient_data = get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Generate PDF
        pdf_bytes = generate_patient_record_pdf(patient_data)
        
        logger.info(f"Successfully generated patient record PDF for patient {patient_id}")
        
        # Return PDF directly with appropriate headers
        # Use Japanese-safe filename encoding
        filename = f"patient_record_{patient_id}.pdf"
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
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error generating patient record PDF: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from db_exc
    except PDFServiceError as pdf_exc:
        logger.error(f"PDF service error generating patient record: {pdf_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from pdf_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error generating patient record PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from exc

