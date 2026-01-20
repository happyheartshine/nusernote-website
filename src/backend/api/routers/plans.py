"""Plan (訪問看護計画書) routes."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from api.dependencies import get_current_user
from models import (
    ErrorResponse,
    PlanCreateRequest,
    PlanEvaluationResponse,
    PlanHospitalizationCreate,
    PlanHospitalizationResponse,
    PlanItemResponse,
    PlanResponse,
    PlansListResponse,
    PlanUpdateRequest,
)
from services.database_service import (
    DatabaseServiceError,
    create_plan,
    create_plan_hospitalization,
    delete_plan,
    get_patient_by_id,
    get_plan_by_id,
    get_plans_by_patient,
    update_plan,
)
from services.pdf_service import PDFServiceError, generate_plan_pdf
from services.plan_service import PlanServiceError, auto_evaluate_plan

logger = logging.getLogger(__name__)

router = APIRouter()


def convert_plan_to_response(plan: Dict[str, Any]) -> PlanResponse:
    """
    Convert plan database dictionary to PlanResponse model.
    
    Args:
        plan: Plan dictionary from database
        
    Returns:
        PlanResponse model instance
    """
    # Convert nested items
    items = []
    for item in plan.get("items", []):
        items.append(PlanItemResponse(
            id=str(item["id"]),
            plan_id=str(item["plan_id"]),
            item_key=item.get("item_key", ""),
            label=item.get("label", ""),
            observation_text=item.get("observation_text"),
            assistance_text=item.get("assistance_text"),
            sort_order=item.get("sort_order", 0),
            created_at=str(item.get("created_at", "")),
            updated_at=str(item.get("updated_at", "")),
        ))
    
    # Convert nested evaluations
    evaluations = []
    for eval_item in plan.get("evaluations", []):
        evaluations.append(PlanEvaluationResponse(
            id=str(eval_item["id"]),
            plan_id=str(eval_item["plan_id"]),
            evaluation_slot=eval_item.get("evaluation_slot", 0),
            evaluation_date=str(eval_item.get("evaluation_date", "")),
            result=eval_item.get("result", "NONE"),
            note=eval_item.get("note"),
            decided_by=eval_item.get("decided_by"),
            source_soap_record_id=str(eval_item["source_soap_record_id"]) if eval_item.get("source_soap_record_id") else None,
            created_at=str(eval_item.get("created_at", "")),
            updated_at=str(eval_item.get("updated_at", "")),
        ))
    
    # Convert nested hospitalizations
    hospitalizations = []
    for hosp_item in plan.get("hospitalizations", []):
        hospitalizations.append(PlanHospitalizationResponse(
            id=str(hosp_item["id"]),
            plan_id=str(hosp_item["plan_id"]),
            hospitalized_at=str(hosp_item.get("hospitalized_at", "")),
            note=hosp_item.get("note"),
            created_at=str(hosp_item.get("created_at", "")),
        ))
    
    return PlanResponse(
        id=str(plan["id"]),
        patient_id=str(plan["patient_id"]),
        title=plan.get("title", "精神科訪問看護計画書"),
        start_date=str(plan.get("start_date", "")),
        end_date=str(plan.get("end_date", "")),
        long_term_goal=plan.get("long_term_goal"),
        short_term_goal=plan.get("short_term_goal"),
        nursing_policy=plan.get("nursing_policy"),
        patient_family_wish=plan.get("patient_family_wish"),
        has_procedure=plan.get("has_procedure", False),
        procedure_content=plan.get("procedure_content"),
        material_details=plan.get("material_details"),
        material_amount=plan.get("material_amount"),
        procedure_note=plan.get("procedure_note"),
        status=plan.get("status", "ACTIVE"),
        closed_at=str(plan["closed_at"]) if plan.get("closed_at") else None,
        closed_reason=plan.get("closed_reason"),
        created_at=str(plan.get("created_at", "")),
        updated_at=str(plan.get("updated_at", "")),
        items=items,
        evaluations=evaluations,
        hospitalizations=hospitalizations,
    )


@router.get(
    "/patients/{patient_id}/plans",
    response_model=PlansListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Get plans for a patient",
    description="Fetch all plans (訪問看護計画書) for a specific patient.",
)
async def get_patient_plans(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    status: str | None = None,
) -> PlansListResponse:
    """
    Fetch all plans for a specific patient.
    
    Requires authentication via Supabase JWT token.
    
    Optional query parameter:
    - status: Filter plans by status (ACTIVE, ENDED_BY_HOSPITALIZATION, CLOSED)
    
    Returns list of plans ordered by start_date DESC.
    """
    try:
        # Verify patient exists and belongs to user
        get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Fetch plans
        plans_data = get_plans_by_patient(
            patient_id=patient_id,
            user_id=current_user["user_id"],
            status=status,
        )
        
        # Convert to response format
        plans = [convert_plan_to_response(plan) for plan in plans_data]
        
        return PlansListResponse(plans=plans)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching plans: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching plans: {exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の取得中にエラーが発生しました。",
        ) from exc


@router.post(
    "/patients/{patient_id}/plans",
    response_model=PlanResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Patient not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Create a plan",
    description="Create a new plan (訪問看護計画書) for a patient.",
)
async def create_plan_endpoint(
    patient_id: str,
    request: PlanCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> PlanResponse:
    """
    Create a new plan for a patient.
    
    Requires authentication via Supabase JWT token.
    
    AUTO-GENERATED: id, user_id, patient_id, title (default), status (default), timestamps
    AUTO-PREFILLED (can override): patient_family_wish (from patient.individual_notes),
                                   long_term_goal, short_term_goal, nursing_policy (from latest SOAP plan_output)
    AUTO-CREATED: plan_items (default 5 items), plan_evaluations (2 slots at +3 and +6 months)
    MANUAL ENTRY REQUIRED: start_date, end_date
    
    On create:
    - Prefills patient-family wish from patient's individual_notes if empty
    - Prefills goals/policy from latest SOAP record's plan_output if empty
    - Creates default plan_items (5 rows with keys) OR populates from SOAP plan_output
    - Creates 2 plan_evaluations slots: start_date+3 months, start_date+6 months
    
    Returns the created plan with items and evaluations.
    """
    try:
        # Verify patient exists and belongs to user
        get_patient_by_id(patient_id=patient_id, user_id=current_user["user_id"])
        
        # Convert items and evaluations to dict format
        items_data = None
        if request.items:
            items_data = [item.dict(exclude_none=True) for item in request.items]
        
        evaluations_data = None
        if request.evaluations:
            evaluations_data = [eval_item.dict(exclude_none=True) for eval_item in request.evaluations]
        
        # Create plan
        plan_data = create_plan(
            user_id=current_user["user_id"],
            patient_id=patient_id,
            title=request.title,
            start_date=request.start_date,
            end_date=request.end_date,
            long_term_goal=request.long_term_goal,
            short_term_goal=request.short_term_goal,
            nursing_policy=request.nursing_policy,
            patient_family_wish=request.patient_family_wish,
            has_procedure=request.has_procedure,
            procedure_content=request.procedure_content,
            material_details=request.material_details,
            material_amount=request.material_amount,
            procedure_note=request.procedure_note,
            items=items_data,
            evaluations=evaluations_data,
        )
        
        # Convert to response format
        return convert_plan_to_response(plan_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Patient {patient_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="利用者が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error creating plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の作成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error creating plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の作成中にエラーが発生しました。",
        ) from exc


@router.get(
    "/plans/{plan_id}",
    response_model=PlanResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Get a plan",
    description="Fetch a single plan (訪問看護計画書) by ID.",
)
async def get_plan_endpoint(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
) -> PlanResponse:
    """
    Fetch a single plan by ID.
    
    Requires authentication via Supabase JWT token.
    
    Returns plan data with items and evaluations.
    """
    try:
        plan_data = get_plan_by_id(plan_id=plan_id, user_id=current_user["user_id"])
        
        # Convert to response format
        return convert_plan_to_response(plan_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error fetching plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の取得中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error fetching plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の取得中にエラーが発生しました。",
        ) from exc


@router.patch(
    "/plans/{plan_id}",
    response_model=PlanResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Update a plan",
    description="Update a plan (訪問看護計画書) and optionally upsert items and evaluations.",
)
async def update_plan_endpoint(
    plan_id: str,
    request: PlanUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> PlanResponse:
    """
    Update a plan.
    
    Requires authentication via Supabase JWT token.
    
    Can update plan fields and upsert:
    - plan_items (by id or item_key)
    - plan_evaluations (by slot)
    
    Returns the updated plan.
    """
    try:
        # Convert items and evaluations to dict format
        items_data = None
        if request.items is not None:
            items_data = [item.dict(exclude_none=True) for item in request.items]
        
        evaluations_data = None
        if request.evaluations is not None:
            evaluations_data = [eval_item.dict(exclude_none=True) for eval_item in request.evaluations]
        
        # Update plan
        plan_data = update_plan(
            plan_id=plan_id,
            user_id=current_user["user_id"],
            title=request.title,
            start_date=request.start_date,
            end_date=request.end_date,
            long_term_goal=request.long_term_goal,
            short_term_goal=request.short_term_goal,
            nursing_policy=request.nursing_policy,
            patient_family_wish=request.patient_family_wish,
            has_procedure=request.has_procedure,
            procedure_content=request.procedure_content,
            material_details=request.material_details,
            material_amount=request.material_amount,
            procedure_note=request.procedure_note,
            status=request.status,
            items=items_data,
            evaluations=evaluations_data,
        )
        
        # Convert to response format
        return convert_plan_to_response(plan_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error updating plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の更新中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error updating plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の更新中にエラーが発生しました。",
        ) from exc


@router.post(
    "/plans/{plan_id}/hospitalize",
    response_model=PlanResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Record hospitalization",
    description="Record a hospitalization and close the plan.",
)
async def hospitalize_plan_endpoint(
    plan_id: str,
    request: PlanHospitalizationCreate,
    current_user: dict = Depends(get_current_user),
) -> PlanResponse:
    """
    Record a hospitalization and close the plan.
    
    Requires authentication via Supabase JWT token.
    
    This will:
    - Create a hospitalization record
    - Set plan status to ENDED_BY_HOSPITALIZATION
    - Set closed_at to now()
    - Set closed_reason to 'HOSPITALIZATION'
    
    Returns the updated plan.
    """
    try:
        # Create hospitalization record
        create_plan_hospitalization(
            plan_id=plan_id,
            user_id=current_user["user_id"],
            hospitalized_at=request.hospitalized_at,
            note=request.note,
        )
        
        # Fetch updated plan
        plan_data = get_plan_by_id(plan_id=plan_id, user_id=current_user["user_id"])
        
        # Convert to response format
        return convert_plan_to_response(plan_data)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error recording hospitalization: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="入院記録の作成中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error recording hospitalization: {exc}")
        raise HTTPException(
            status_code=500,
            detail="入院記録の作成中にエラーが発生しました。",
        ) from exc


@router.post(
    "/plans/{plan_id}/auto-evaluate",
    response_model=PlanResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Auto-evaluate plan",
    description="Auto-evaluate plan based on SOAP record visit durations.",
)
async def auto_evaluate_plan_endpoint(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
) -> PlanResponse:
    """
    Auto-evaluate plan based on SOAP record visit durations.
    
    Requires authentication via Supabase JWT token.
    
    This will:
    - Find SOAP records for the plan's patient within plan date range
    - Calculate visit durations from start_time/end_time
    - Apply evaluation results (CIRCLE/CHECK) to nearest evaluation slot
    - Mark evaluations as decided_by='AUTO'
    
    Returns the updated plan.
    """
    try:
        plan_data = auto_evaluate_plan(
            plan_id=plan_id,
            user_id=current_user["user_id"],
        )
        
        # Convert to response format
        return convert_plan_to_response(plan_data)
        
    except PlanServiceError as plan_exc:
        logger.error(f"Plan service error auto-evaluating: {plan_exc}")
        raise HTTPException(
            status_code=500,
            detail="自動評価中にエラーが発生しました。",
        ) from plan_exc
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error auto-evaluating plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="自動評価中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error auto-evaluating plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="自動評価中にエラーが発生しました。",
        ) from exc


@router.delete(
    "/plans/{plan_id}",
    response_class=Response,
    responses={
        204: {"description": "Plan deleted successfully"},
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Delete a plan",
    description="Delete a plan (訪問看護計画書) and all related records.",
)
async def delete_plan_endpoint(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
) -> Response:
    """
    Delete a plan record.
    
    Requires authentication via Supabase JWT token.
    
    This will delete:
    - The plan record
    - All related plan_items (CASCADE)
    - All related plan_evaluations (CASCADE)
    - All related plan_hospitalizations (CASCADE)
    
    Returns 204 No Content on success.
    """
    try:
        delete_plan(plan_id=plan_id, user_id=current_user["user_id"])
        
        return Response(status_code=204)
        
    except DatabaseServiceError as db_exc:
        error_msg = str(db_exc)
        if "not found" in error_msg.lower():
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error deleting plan: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の削除中にエラーが発生しました。",
        ) from db_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error deleting plan: {exc}")
        raise HTTPException(
            status_code=500,
            detail="計画書の削除中にエラーが発生しました。",
        ) from exc


@router.get(
    "/plans/{plan_id}/pdf",
    response_class=Response,
    responses={
        401: {"model": ErrorResponse, "description": "Authentication error"},
        404: {"model": ErrorResponse, "description": "Plan not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["plans"],
    summary="Generate plan PDF",
    description="Generate 精神科訪問看護計画書 PDF for a plan and return it directly.",
)
async def generate_plan_pdf_endpoint(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
) -> Response:
    """
    Generate plan PDF (精神科訪問看護計画書) for a specific plan.
    
    Requires authentication via Supabase JWT token.
    
    Returns the PDF file directly.
    """
    try:
        # Fetch plan and patient data
        plan_data = get_plan_by_id(plan_id=plan_id, user_id=current_user["user_id"])
        patient_id = plan_data["patient_id"]
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
                .single()
                .execute()
            )
            if org_response.data:
                org_settings = org_response.data
        except Exception:
            # Org settings not found, use defaults
            pass
        
        # Generate PDF
        pdf_bytes = generate_plan_pdf(plan_data, patient_data, org_settings)
        
        logger.info(f"Successfully generated plan PDF for plan {plan_id}")
        
        # Return PDF directly with appropriate headers
        filename = f"plan_{plan_id}.pdf"
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
            logger.warning(f"Plan {plan_id} not found for user {current_user['user_id']}")
            raise HTTPException(
                status_code=404,
                detail="計画書が見つかりませんでした。",
            ) from db_exc
        logger.error(f"Database error generating plan PDF: {db_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from db_exc
    except PDFServiceError as pdf_exc:
        logger.error(f"PDF service error generating plan: {pdf_exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from pdf_exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.error(f"Unexpected error generating plan PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail="PDF生成中にエラーが発生しました。",
        ) from exc
