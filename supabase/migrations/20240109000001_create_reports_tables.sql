-- Migration: Create Monthly Report (精神科訪問看護報告書) tables
-- This migration creates tables for managing monthly reports

-- ============================================================================
-- Table: reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  
  -- Report period
  year_month TEXT NOT NULL,  -- Format: 'YYYY-MM' (e.g. '2026-01')
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Report content sections
  disease_progress_text TEXT,              -- 病状の経過
  nursing_rehab_text TEXT,                 -- 看護・リハビリテーションの内容
  family_situation_text TEXT,              -- 家庭状況
  procedure_text TEXT,                     -- 処置 / 衛生材料（頻度・種類・サイズ）等及び必要量
  monitoring_text TEXT,                    -- 特記すべき事項及びモニタリング
  gaf_score INTEGER,                       -- GAF score (optional)
  gaf_date DATE,                           -- GAF date (optional)
  
  -- Footer fields
  profession_text TEXT DEFAULT '訪問した職種：看護師',
  report_date DATE DEFAULT CURRENT_DATE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT',    -- DRAFT / FINAL
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT reports_status_check CHECK (status IN ('DRAFT', 'FINAL')),
  CONSTRAINT reports_date_check CHECK (period_end >= period_start),
  CONSTRAINT reports_year_month_unique UNIQUE (user_id, patient_id, year_month)
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON public.reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_patient_year_month ON public.reports(patient_id, year_month);
CREATE INDEX IF NOT EXISTS idx_reports_year_month ON public.reports(year_month);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- ============================================================================
-- Table: report_visit_marks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_visit_marks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  
  -- Visit date and mark
  visit_date DATE NOT NULL,
  mark TEXT NOT NULL,  -- CIRCLE / TRIANGLE / DOUBLE_CIRCLE / SQUARE / CHECK
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT report_visit_marks_mark_check CHECK (mark IN ('CIRCLE', 'TRIANGLE', 'DOUBLE_CIRCLE', 'SQUARE', 'CHECK')),
  CONSTRAINT report_visit_marks_unique UNIQUE (report_id, visit_date, mark)
);

-- Indexes for report_visit_marks
CREATE INDEX IF NOT EXISTS idx_report_visit_marks_user_id ON public.report_visit_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_report_visit_marks_report_id ON public.report_visit_marks(report_id);
CREATE INDEX IF NOT EXISTS idx_report_visit_marks_visit_date ON public.report_visit_marks(visit_date);
CREATE INDEX IF NOT EXISTS idx_report_visit_marks_report_visit ON public.report_visit_marks(report_id, visit_date);

-- ============================================================================
-- Table: org_settings (if not exists)
-- ============================================================================
-- Note: This table may already exist from plans migration
-- Using CREATE TABLE IF NOT EXISTS to be safe
CREATE TABLE IF NOT EXISTS public.org_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Organization info
  station_name TEXT,
  station_address TEXT,
  admin_name TEXT,
  profession_text TEXT DEFAULT '訪問した職種：看護師',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for org_settings (if not exists)
CREATE INDEX IF NOT EXISTS idx_org_settings_user_id ON public.org_settings(user_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_visit_marks ENABLE ROW LEVEL SECURITY;
-- org_settings RLS should already exist, but ensure it's enabled
ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;

-- Reports RLS policies
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own reports"
  ON public.reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Report visit marks RLS policies
CREATE POLICY "Users can view their own report_visit_marks"
  ON public.report_visit_marks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own report_visit_marks"
  ON public.report_visit_marks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own report_visit_marks"
  ON public.report_visit_marks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report_visit_marks"
  ON public.report_visit_marks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Org settings RLS policies (only create if they don't exist)
-- Note: These may already exist from plans migration, but CREATE POLICY IF NOT EXISTS doesn't exist
-- So we'll let it fail gracefully if they already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'org_settings' 
    AND policyname = 'Users can view their own org_settings'
  ) THEN
    CREATE POLICY "Users can view their own org_settings"
      ON public.org_settings
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'org_settings' 
    AND policyname = 'Users can insert their own org_settings'
  ) THEN
    CREATE POLICY "Users can insert their own org_settings"
      ON public.org_settings
      FOR INSERT
      WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'org_settings' 
    AND policyname = 'Users can update their own org_settings'
  ) THEN
    CREATE POLICY "Users can update their own org_settings"
      ON public.org_settings
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'org_settings' 
    AND policyname = 'Users can delete their own org_settings'
  ) THEN
    CREATE POLICY "Users can delete their own org_settings"
      ON public.org_settings
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_visit_marks_updated_at
  BEFORE UPDATE ON public.report_visit_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Org settings trigger should already exist, but ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_org_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_org_settings_updated_at
      BEFORE UPDATE ON public.org_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.reports IS '精神科訪問看護報告書 (Monthly Reports)';
COMMENT ON COLUMN public.reports.year_month IS 'Report period in YYYY-MM format';
COMMENT ON COLUMN public.reports.disease_progress_text IS '病状の経過';
COMMENT ON COLUMN public.reports.nursing_rehab_text IS '看護・リハビリテーションの内容';
COMMENT ON COLUMN public.reports.family_situation_text IS '家庭状況';
COMMENT ON COLUMN public.reports.procedure_text IS '処置 / 衛生材料（頻度・種類・サイズ）等及び必要量';
COMMENT ON COLUMN public.reports.monitoring_text IS '特記すべき事項及びモニタリング';
COMMENT ON COLUMN public.reports.status IS 'Report status: DRAFT or FINAL';

COMMENT ON TABLE public.report_visit_marks IS 'Calendar visit marks for reports';
COMMENT ON COLUMN public.report_visit_marks.mark IS 'Mark type: CIRCLE (○), TRIANGLE (△), DOUBLE_CIRCLE (◎), SQUARE (□), CHECK (✔︎)';

COMMENT ON TABLE public.org_settings IS 'Organization settings for PDF footer (may already exist from plans)';
