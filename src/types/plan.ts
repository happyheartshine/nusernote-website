/**
 * TypeScript types for Plan (訪問看護計画書) feature
 * Aligned with backend models.py
 */

export type PlanStatus = 'ACTIVE' | 'CLOSED' | 'ENDED_BY_HOSPITALIZATION';

export type EvaluationResultType = 'NONE' | 'CIRCLE' | 'CHECK';

export interface PlanItem {
  id: string;
  plan_id: string;
  label: string;
  observation: string | null;
  assistance: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanEvaluation {
  id: string;
  plan_id: string;
  scheduled_date: string; // YYYY-MM-DD
  result_type: EvaluationResultType;
  note: string | null;
  decided_by_visit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanHospitalization {
  id: string;
  plan_id: string;
  hospitalized_at: string; // YYYY-MM-DD
  discharged_at: string | null; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

export interface PlanCareSupply {
  id: string;
  plan_id: string;
  has_procedure: boolean;
  procedure_content: string | null;
  material_type_size: string | null;
  required_amount: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanDetail {
  id: string;
  patient_id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  long_term_goal: string;
  short_term_goal: string | null;
  policy: string | null;
  status: PlanStatus;
  closed_at: string | null;
  closed_reason: string | null;
  created_at: string;
  updated_at: string;
  items: PlanItem[];
  evaluations: PlanEvaluation[];
  hospitalizations: PlanHospitalization[];
  care_supplies: PlanCareSupply[];
}

export interface PlanListResponse {
  plans: PlanDetail[];
}

export interface PatientSummary {
  id: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  address: string | null;
  contact: string | null;
  primary_diagnosis: string | null;
  care_level?: string | null; // 要介護度 (if available)
}

// Request types for creating/updating plans
export interface PlanItemCreate {
  id?: string | null;
  label: string;
  observation?: string | null;
  assistance?: string | null;
  sort_order?: number;
}

export interface PlanEvaluationCreate {
  id?: string | null;
  scheduled_date: string; // YYYY-MM-DD
  result_type?: EvaluationResultType;
  note?: string | null;
}

export interface PlanCreateRequest {
  title?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  long_term_goal?: string;
  short_term_goal?: string | null;
  policy?: string | null;
  items?: PlanItemCreate[];
  evaluations?: PlanEvaluationCreate[];
  care_supplies?: any[];
}

export interface PlanUpdateRequest {
  title?: string | null;
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  long_term_goal?: string | null;
  short_term_goal?: string | null;
  policy?: string | null;
  status?: PlanStatus | null;
  items?: PlanItemCreate[] | null;
  evaluations?: PlanEvaluationCreate[] | null;
  care_supplies?: any[] | null;
}

export interface PlanHospitalizationCreate {
  hospitalized_at: string; // YYYY-MM-DD
  discharged_at?: string | null; // YYYY-MM-DD
  note?: string | null;
}
