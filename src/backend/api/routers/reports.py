"""Report (精神科訪問看護報告書) routes."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from api.dependencies import get_current_user
from models import (
    ErrorResponse,
    ReportCreateRequest,
    ReportRegenerateRequest,
    ReportResponse,
    ReportUpdateRequest,
    ReportVisitMarkResponse,
    ReportsListResponse,
)
from services.database_service import (
    DatabaseServiceError,
    create_report,
    delete_report,
    get_patient_by_id,
    get_report_by_id,
    get_reports_by_patient,
    update_report,
)
from services.report_service import ReportServiceError, regenerate_report_marks
from services.report_pdf_service import ReportPDFServiceError, generate_report_pdf

logger = logging.getLogger(__name__)

router = APIRouter()


def convert_report_to_response(report: Dict[str, Any]) -> ReportResponse:
    """
    Convert report database dictionary to ReportResponse model.
    
    Args:
        report: Report dictionary from database
        
    Returns:
        ReportResponse model instance
    """
    # Convert visit marks
    visit_marks = []
    for mark in report.get("visit_marks", []):
        visit_marks.append(ReportVisitMarkResponse(
            id=str(mark["id"]),
            report_id=str(mark["report_id"]),
            visit_date=str(mark.get("visit_date", "")),
            mark=mark.get("mark", ""),
            created_at=str(mark.get("created_at", "")),
            updated_at=str(mark.get("updated_at", "")),
        ))
    
    # Helper to safely convert date to string
    def safe_date_str(value):
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return str(value)
    
    return ReportResponse(
        id=str(report["id"]),
        patient_id=str(report["patient_id"]),
        year_month=report.get("year_month", ""),
        period_start=safe_date_str(report.get("period_start")) or "",
        period_end=safe_date_str(report.get("period_end")) or "",
        disease_progress_text=report.get("disease_progress_text"),
        nursing_rehab_text=report.get("nursing_rehab_text"),
        family_situation_text=report.get("family_situation_text"),
        procedure_text=report.get("procedure_text"),
        monitoring_text=report.get("monitoring_text"),
        gaf_score=report.get("gaf_score"),
        gaf_date=safe_date_str(report.get("gaf_date")),
        profession_text=report.get("profession_text", "訪問した職種：看護師"),
        report_date=safe_date_str(report.get("report_date")) or "",
        status=report.get("status", "DRAFT"),
        created_at=safe_date_str(report.get("created_at")) or "",
        updated_at=safe_date_str(report.get("updated_at")) or "",
        visit_marks=visit_marks,
    )


@router.get(
    "/patients/{patient_id}/reports",
    response_model=ReportsListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Get reports for a patient",
    description="Fetch all reports (精神科訪問看護報告書) for a specific patient.",
)
async def get_patient_reports(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    year_month: str | None = Query(None, description="Filter by year-month (YYYY-MM)"),
) -> ReportsListResponse:
    """
    Fetch all reports for a specific patient.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameter:
    - year_month: Filter reports by year-month (YYYY-MM format)
    
    Returns list of reports ordered by year_month DESC.
    """
    try:
        # Verify patient exists and belongs to user
        get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Fetch reports
        reports_data = get_reports_by_patient(
            patient_id=patient_id,
            user_id=current_user["user_id"],
            year_month=year_month,
        )
        
        # Convert to response format
        reports = [convert_report_to_response(report) for report in reports_data]
        
        return ReportsListResponse(reports=reports)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching reports: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching reports: {exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の取得中にエラーが発生しました。",
        ) from exc


@router.post(
    "/patients/{patient_id}/reports",
    response_model=ReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Create a report",
    description="Create a new report (精神科訪問看護報告書) for a patient.",
)
async def create_report_endpoint(
    patient_id: str,
    request: ReportCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> ReportResponse:
    """
    Create a new report for a patient.
    
    Requires authentication via Supabase JWT token.
    
    AUTO-GENERATED: id, user_id, patient_id, year_month, period_start, period_end,
                   status (default: DRAFT), profession_text (default), report_date (default), timestamps
    AUTO-GENERATED VISIT MARKS: CIRCLE (○) for 1 visit, DOUBLE_CIRCLE (◎) for 2+ visits,
                                CHECK (✔︎) for visits < 30 minutes (from SOAP records)
    AUTO-PREFILLED (can override): disease_progress_text (from last 10 SOAP records)
    MANUAL ENTRY REQUIRED: year_month OR (period_start + period_end)
    
    On create:
    - Creates report row with empty text fields
    - Auto-generates report_visit_marks from soap_records for that month (○/◎ and ✔︎)
    - Optionally prefills disease_progress_text using last N soap_records
    
    Note: TRIANGLE (△) and SQUARE (□) marks are manual only, not auto-generated.
    
    Returns the created report with visit marks.
    """
    try:
        # Verify patient exists and belongs to user
        get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Create report
        report_data = create_report(
            user_id=current_user["user_id"],
            patient_id=patient_id,
            year_month=request.year_month,
            period_start=request.period_start,
            period_end=request.period_end,
        )
        
        # Convert to response format
        return convert_report_to_response(report_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        if "already exists" in error_msg.lower():
            logger.warning(f"Report already exists: {db_exc}")
            raise HTTPException(
                status_code=400,
                detail="この期間の報告書は既に存在します。",
            ) from db_exc
        logger.error(f"Database error creating report: {db_exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"報告書の作成中にエラーが発生しました: {error_msg}",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error creating report: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"報告書の作成中にエラーが発生しました: {str(exc)}",
        ) from exc


@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Report not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Get a report",
    description="Fetch a single report (精神科訪問看護報告書) by ID.",
)
async def get_report_endpoint(
    report_id: str,
    current_user: dict = Depends(get_current_user),
) -> ReportResponse:
    """
    Fetch a single report by ID.
    
    Requires authentication via Supabase JWT token.
    
    Returns report data with visit marks.
    """
    try:
        report_data = get_report_by_id(report_id=report_id, user_id=current_user["user_id"])
        
        # Convert to response format
        return convert_report_to_response(report_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Report {report_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="報告書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching report: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching report: {exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の取得中にエラーが発生しました。",
        ) from exc


@router.patch(
    "/reports/{report_id}",
    response_model=ReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Report not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Update a report",
    description="Update a report (精神科訪問看護報告書) and optionally upsert visit marks.",
)
async def update_report_endpoint(
    report_id: str,
    request: ReportUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> ReportResponse:
    """
    Update a report.
    
    Requires authentication via Supabase JWT token.
    
    Can update report fields and upsert:
    - visit_marks (by visit_date)
    
    Returns the updated report.
    """
    try:
        # Convert visit marks to dict format
        visit_marks_data = None
        if request.visit_marks is not None:
            visit_marks_data = [mark.dict(exclude_none=True) for mark in request.visit_marks]
        
        # Update report
        report_data = update_report(
            report_id=report_id,
            user_id=current_user["user_id"],
            disease_progress_text=request.disease_progress_text,
            nursing_rehab_text=request.nursing_rehab_text,
            family_situation_text=request.family_situation_text,
            procedure_text=request.procedure_text,
            monitoring_text=request.monitoring_text,
            gaf_score=request.gaf_score,
            gaf_date=request.gaf_date,
            profession_text=request.profession_text,
            report_date=request.report_date,
            status=request.status,
            visit_marks=visit_marks_data,
        )
        
        # Convert to response format
        return convert_report_to_response(report_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Report {report_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="報告書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error updating report: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の更新中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error updating report: {exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の更新中にエラーが発生しました。",
        ) from exc


@router.post(
    "/reports/{report_id}/regenerate",
    response_model=ReportResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Report not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Regenerate report marks",
    description="Re-run auto mark generation and optionally regenerate draft summaries.",
)
async def regenerate_report_endpoint(
    report_id: str,
    request: ReportRegenerateRequest,
    current_user: dict = Depends(get_current_user),
) -> ReportResponse:
    """
    Regenerate visit marks for a report.
    
    Requires authentication via Supabase JWT token.
    
    This will:
    - Re-run auto mark generation from soap_records
    - Optionally regenerate draft summaries (if force=true)
    - Do not overwrite fields if already edited unless force=true
    
    Returns the updated report.
    """
    try:
        report_data = regenerate_report_marks(
            report_id=report_id,
            user_id=current_user["user_id"],
            force=request.force,
        )
        
        # Convert to response format
        return convert_report_to_response(report_data)
        
    except ReportServiceError as report_exc:
        logger.error(f"Report service error regenerating: {report_exc}")
        raise HTTPException(
            status_code=500,
            detail="マークの再生成中にエラーが発生しました。",
        ) from report_exc
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Report {report_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="報告書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error regenerating report: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="マークの再生成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error regenerating report: {exc}")
        raise HTTPException(
            status_code=500,
            detail="マークの再生成中にエラーが発生しました。",
        ) from exc


@router.delete(
    "/reports/{report_id}",
    response_model=dict,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Report not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Delete a report",
    description="Delete a report (精神科訪問看護報告書) and its associated visit marks.",
)
async def delete_report_endpoint(
    report_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Delete a report.
    
    Requires authentication via Supabase JWT token.
    
    This will delete the report and all associated visit marks (CASCADE).
    
    Returns success message.
    """
    try:
        delete_report(report_id=report_id, user_id=current_user["user_id"])
        
        logger.info(f"Successfully deleted report {report_id} for user {current_user['user_id']}")
        return {"message": "報告書が削除されました。", "id": report_id}
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Report {report_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="報告書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error deleting report: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の削除中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error deleting report: {exc}")
        raise HTTPException(
            status_code=500,
            detail="報告書の削除中にエラーが発生しました。",
        ) from exc


@router.get(
    "/reports/{report_id}/pdf",
    response_class=Response,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Report not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["reports"],
    summary="Generate report PDF",
    description="Generate 精神科訪問看護報告書 PDF for a report and return it directly.",
)
async def generate_report_pdf_endpoint(
    report_id: str,
    current_user: dict = Depends(get_current_user),
) -> Response:
    """
    Generate report PDF (精神科訪問看護報告書) for a specific report.
    
    Requires authentication via Supabase JWT token.
    
    Returns the PDF file directly.
    """
    try:
        # Fetch report and patient data
        report_data = get_report_by_id(report_id=report_id, user_id=current_user["user_id"])
        patient_id = report_data["patient_id"]
        patient_data = get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Fetch org settings (optional)
        org_settings = None
        try:
            from services.database_service import get_supabase_client
            supabase = get_supabase_client()
            org_response = (
                supabase.table("org_settings")
                .select("*")
                .eq("user_id", current_user["user_id"])
                .maybe_single()
                .execute()
            )
            if org_response.data:
                org_settings = org_response.data
        except Exception:
            # Org settings not found, use defaults
            pass
        
        # Generate PDF
        pdf_bytes = generate_report_pdf(report_data, patient_data, org_settings)
        
        logger.info(f"Successfully generated report PDF for report {report_id}")
        
        # Return PDF directly with appropriate headers
        filename = f"report_{report_id}.pdf"
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
            logger.warning(f"Report {report_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="報告書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error generating report PDF: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from db_exc
    except ReportPDFServiceError as pdf_exc:
        logger.error(f"PDF service error generating report: {pdf_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from pdf_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error generating report PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from exc
