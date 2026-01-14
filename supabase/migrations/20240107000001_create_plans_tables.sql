-- Migration: Create Plan (訪問看護計画書) tables
-- This migration creates tables for managing nursing care plans

-- ============================================================================
-- Table: plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  
  -- Plan metadata
  title TEXT NOT NULL DEFAULT '精神科訪問看護計画書',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Plan content
  long_term_goal TEXT,                    -- 看護の目標
  short_term_goal TEXT,                   -- 短期目標
  nursing_policy TEXT,                     -- 看護援助の方針
  patient_family_wish TEXT,                -- 患者様とご家族の希望
  
  -- Procedure information
  has_procedure BOOLEAN NOT NULL DEFAULT FALSE,  -- 衛生材料等を要する処置の有無
  procedure_content TEXT,                 -- 処置内容
  material_details TEXT,                   -- 衛生材料（種類・サイズ）等
  material_amount TEXT,                    -- 必要量
  procedure_note TEXT,                     -- 備考
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE / ENDED_BY_HOSPITALIZATION / CLOSED
  closed_at TIMESTAMPTZ,
  closed_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT plans_status_check CHECK (status IN ('ACTIVE', 'ENDED_BY_HOSPITALIZATION', 'CLOSED')),
  CONSTRAINT plans_date_check CHECK (end_date >= start_date)
);

-- Indexes for plans
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_patient_id ON public.plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_plans_patient_status ON public.plans(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_start_date ON public.plans(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON public.plans(created_at DESC);

-- ============================================================================
-- Table: plan_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  
  -- Item structure
  item_key TEXT NOT NULL,                  -- e.g. 'LONG_TERM','SHORT_TERM','POLICY','SPECIFIC_CONTENT','LIFE_RHYTHM'
  label TEXT NOT NULL,                     -- Display label
  observation_text TEXT,                   -- 必要な観察項目
  assistance_text TEXT,                    -- 援助内容
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for plan_items
CREATE INDEX IF NOT EXISTS idx_plan_items_user_id ON public.plan_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON public.plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_sort ON public.plan_items(plan_id, sort_order);

-- ============================================================================
-- Table: plan_evaluations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  
  -- Evaluation slot
  evaluation_slot INTEGER NOT NULL,        -- 1, 2, ...
  evaluation_date DATE NOT NULL,
  
  -- Evaluation result
  result TEXT NOT NULL DEFAULT 'NONE',     -- CIRCLE / CHECK / NONE
  note TEXT,
  decided_by TEXT,                         -- 'AUTO' / 'MANUAL' (future use)
  source_soap_record_id UUID,              -- Future link to soap_records
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT plan_evaluations_result_check CHECK (result IN ('CIRCLE', 'CHECK', 'NONE')),
  CONSTRAINT plan_evaluations_slot_unique UNIQUE (plan_id, evaluation_slot)
);

-- Indexes for plan_evaluations
CREATE INDEX IF NOT EXISTS idx_plan_evaluations_user_id ON public.plan_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_evaluations_plan_id ON public.plan_evaluations(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_evaluations_plan_slot ON public.plan_evaluations(plan_id, evaluation_slot);

-- ============================================================================
-- Table: plan_hospitalizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_hospitalizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  
  -- Hospitalization info
  hospitalized_at DATE NOT NULL,
  note TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for plan_hospitalizations
CREATE INDEX IF NOT EXISTS idx_plan_hospitalizations_user_id ON public.plan_hospitalizations(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_hospitalizations_plan_id ON public.plan_hospitalizations(plan_id);

-- ============================================================================
-- Table: org_settings (optional but recommended for PDF footer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Organization info
  station_name TEXT,
  station_address TEXT,
  planner_name TEXT,
  profession_text TEXT DEFAULT '訪問する職種：看護師・准看護師',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for org_settings
CREATE INDEX IF NOT EXISTS idx_org_settings_user_id ON public.org_settings(user_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Plans RLS policies
CREATE POLICY "Users can view their own plans"
  ON public.plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
  ON public.plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own plans"
  ON public.plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON public.plans
  FOR DELETE
  USING (auth.uid() = user_id);

-- Plan items RLS policies
CREATE POLICY "Users can view their own plan_items"
  ON public.plan_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan_items"
  ON public.plan_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own plan_items"
  ON public.plan_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plan_items"
  ON public.plan_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Plan evaluations RLS policies
CREATE POLICY "Users can view their own plan_evaluations"
  ON public.plan_evaluations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan_evaluations"
  ON public.plan_evaluations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own plan_evaluations"
  ON public.plan_evaluations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plan_evaluations"
  ON public.plan_evaluations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Plan hospitalizations RLS policies
CREATE POLICY "Users can view their own plan_hospitalizations"
  ON public.plan_hospitalizations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan_hospitalizations"
  ON public.plan_hospitalizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own plan_hospitalizations"
  ON public.plan_hospitalizations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plan_hospitalizations"
  ON public.plan_hospitalizations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Org settings RLS policies
CREATE POLICY "Users can view their own org_settings"
  ON public.org_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own org_settings"
  ON public.org_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own org_settings"
  ON public.org_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own org_settings"
  ON public.org_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_items_updated_at
  BEFORE UPDATE ON public.plan_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_evaluations_updated_at
  BEFORE UPDATE ON public.plan_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_settings_updated_at
  BEFORE UPDATE ON public.org_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.plans IS '訪問看護計画書 (Nursing Care Plans)';
COMMENT ON COLUMN public.plans.long_term_goal IS '看護の目標';
COMMENT ON COLUMN public.plans.short_term_goal IS '短期目標';
COMMENT ON COLUMN public.plans.nursing_policy IS '看護援助の方針';
COMMENT ON COLUMN public.plans.patient_family_wish IS '患者様とご家族の希望';
COMMENT ON COLUMN public.plans.has_procedure IS '衛生材料等を要する処置の有無';
COMMENT ON COLUMN public.plans.status IS 'Plan status: ACTIVE, ENDED_BY_HOSPITALIZATION, or CLOSED';

COMMENT ON TABLE public.plan_items IS 'Plan structured items (観察項目・援助内容)';
COMMENT ON COLUMN public.plan_items.item_key IS 'Item key identifier (e.g. LONG_TERM, SHORT_TERM, POLICY)';
COMMENT ON COLUMN public.plan_items.observation_text IS '必要な観察項目';
COMMENT ON COLUMN public.plan_items.assistance_text IS '援助内容';

COMMENT ON TABLE public.plan_evaluations IS 'Plan evaluations (3-month evaluations)';
COMMENT ON COLUMN public.plan_evaluations.evaluation_slot IS 'Evaluation slot number (1, 2, ...)';
COMMENT ON COLUMN public.plan_evaluations.result IS 'Evaluation result: CIRCLE (◯), CHECK (☑️), or NONE';
COMMENT ON COLUMN public.plan_evaluations.decided_by IS 'How the result was decided: AUTO or MANUAL';

COMMENT ON TABLE public.plan_hospitalizations IS 'Hospitalization records for plans';
COMMENT ON COLUMN public.plan_hospitalizations.hospitalized_at IS 'Date of hospitalization';

COMMENT ON TABLE public.org_settings IS 'Organization settings for PDF footer';
