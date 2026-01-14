"""Plan service for visit duration calculation and auto-evaluation."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from services.database_service import DatabaseServiceError, get_plan_by_id, get_soap_records_for_plan, update_plan

logger = logging.getLogger(__name__)

# Configuration for visit duration thresholds (in minutes)
# These are placeholder values - adjust based on business requirements
VISIT_DURATION_THRESHOLD_CIRCLE = 30  # Minutes - visits >= this get CIRCLE (◯)
VISIT_DURATION_THRESHOLD_CHECK = 60  # Minutes - visits >= this get CHECK (☑️)


class PlanServiceError(Exception):
    """Exception raised for plan service errors."""
    pass


def calculate_visit_duration_minutes(start_time: Optional[str], end_time: Optional[str]) -> Optional[int]:
    """
    Calculate visit duration in minutes from start_time and end_time.
    
    Args:
        start_time: Start time string (HH:MM:SS or HH:MM format)
        end_time: End time string (HH:MM:SS or HH:MM format)
        
    Returns:
        Duration in minutes, or None if times are invalid or missing.
    """
    if not start_time or not end_time:
        return None
    
    try:
        # Parse time strings (handle both HH:MM:SS and HH:MM formats)
        start_parts = start_time.split(":")
        end_parts = end_time.split(":")
        
        if len(start_parts) < 2 or len(end_parts) < 2:
            return None
        
        start_hour = int(start_parts[0])
        start_minute = int(start_parts[1])
        end_hour = int(end_parts[0])
        end_minute = int(end_parts[1])
        
        # Calculate duration
        start_total_minutes = start_hour * 60 + start_minute
        end_total_minutes = end_hour * 60 + end_minute
        
        # Handle overnight visits (if end < start, assume next day)
        if end_total_minutes < start_total_minutes:
            duration = (24 * 60) - start_total_minutes + end_total_minutes
        else:
            duration = end_total_minutes - start_total_minutes
        
        return duration
        
    except (ValueError, IndexError) as e:
        logger.warning(f"Error parsing visit times: start_time={start_time}, end_time={end_time}, error={e}")
        return None


def determine_evaluation_result(duration_minutes: Optional[int]) -> str:
    """
    Determine evaluation result (CIRCLE, CHECK, or NONE) based on visit duration.
    
    Args:
        duration_minutes: Visit duration in minutes
        
    Returns:
        "CIRCLE" if duration >= CHECK threshold,
        "CHECK" if duration >= CIRCLE threshold,
        "NONE" otherwise
    """
    if duration_minutes is None:
        return "NONE"
    
    if duration_minutes >= VISIT_DURATION_THRESHOLD_CHECK:
        return "CIRCLE"
    elif duration_minutes >= VISIT_DURATION_THRESHOLD_CIRCLE:
        return "CHECK"
    else:
        return "NONE"


def auto_evaluate_plan(plan_id: str, user_id: str) -> Dict[str, Any]:
    """
    Auto-evaluate plan based on SOAP record visit durations.
    
    This function:
    1. Fetches SOAP records for the plan's patient within the plan date range
    2. Calculates visit durations from start_time/end_time
    3. Applies evaluation results to the nearest evaluation slot or latest slot
    4. Updates plan_evaluations with AUTO decision
    
    Args:
        plan_id: Plan ID (UUID)
        user_id: Authenticated user ID
        
    Returns:
        Updated plan dictionary with evaluations.
        
    Raises:
        PlanServiceError: If auto-evaluation fails.
    """
    try:
        # Get plan with evaluations
        plan = get_plan_by_id(plan_id, user_id)
        
        if not plan.get("evaluations"):
            logger.warning(f"Plan {plan_id} has no evaluations to update")
            return plan
        
        # Get SOAP records for this plan
        soap_records = get_soap_records_for_plan(plan_id, user_id)
        
        if not soap_records:
            logger.info(f"No SOAP records found for plan {plan_id}")
            return plan
        
        # Calculate durations and determine results
        evaluation_results = {}
        
        for record in soap_records:
            visit_date = record.get("visit_date")
            start_time = record.get("start_time")
            end_time = record.get("end_time")
            
            if not visit_date:
                continue
            
            duration = calculate_visit_duration_minutes(start_time, end_time)
            result = determine_evaluation_result(duration)
            
            if result == "NONE":
                continue
            
            # Find nearest evaluation slot for this visit date
            visit_dt = datetime.strptime(visit_date, "%Y-%m-%d")
            best_slot = None
            min_diff = None
            
            for eval_item in plan["evaluations"]:
                eval_date_str = eval_item.get("evaluation_date")
                if not eval_date_str:
                    continue
                
                try:
                    eval_dt = datetime.strptime(eval_date_str, "%Y-%m-%d")
                    diff = abs((visit_dt - eval_dt).days)
                    
                    if min_diff is None or diff < min_diff:
                        min_diff = diff
                        best_slot = eval_item.get("evaluation_slot")
                except ValueError:
                    continue
            
            # If no slot found, use the latest slot
            if best_slot is None and plan["evaluations"]:
                best_slot = max(eval_item.get("evaluation_slot", 0) for eval_item in plan["evaluations"])
            
            if best_slot is not None:
                # Keep the "better" result (CIRCLE > CHECK > NONE)
                current_result = evaluation_results.get(best_slot, "NONE")
                if result == "CIRCLE" or (result == "CHECK" and current_result != "CIRCLE"):
                    evaluation_results[best_slot] = result
        
        # Update evaluations
        updated_evaluations = []
        for eval_item in plan["evaluations"]:
            slot = eval_item.get("evaluation_slot")
            if slot in evaluation_results:
                updated_eval = {
                    "id": eval_item.get("id"),
                    "evaluation_slot": slot,
                    "evaluation_date": eval_item.get("evaluation_date"),
                    "result": evaluation_results[slot],
                    "note": eval_item.get("note"),
                    "decided_by": "AUTO",
                }
                updated_evaluations.append(updated_eval)
        
        if updated_evaluations:
            # Update plan with new evaluations
            plan = update_plan(
                plan_id=plan_id,
                user_id=user_id,
                evaluations=updated_evaluations,
            )
            
            logger.info(f"Auto-evaluated plan {plan_id}: updated {len(updated_evaluations)} evaluations")
        else:
            logger.info(f"No evaluations updated for plan {plan_id}")
        
        return plan
        
    except DatabaseServiceError:
        raise
    except Exception as e:
        logger.error(f"Error auto-evaluating plan: {e}")
        raise PlanServiceError(f"Failed to auto-evaluate plan: {str(e)}") from e
