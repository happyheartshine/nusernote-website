-- Migration: Create visit_records (訪問記録) table
-- This table stores detailed patient visit record information (精神科訪問看護記録書Ⅰ)

-- Create the visit_records table
CREATE TABLE IF NOT EXISTS public.visit_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Basic Patient Information (from template)
  patient_name TEXT NOT NULL,
  gender TEXT, -- 'male' or 'female'
  birth_date DATE,
  birth_date_year INTEGER,
  birth_date_month INTEGER,
  birth_date_day INTEGER,
  age INTEGER,
  patient_address TEXT,
  patient_contact TEXT,
  
  -- Key Person Information (キーパーソン)
  key_person_name TEXT,
  key_person_relationship TEXT, -- 続柄
  key_person_address TEXT,
  key_person_contact1 TEXT,
  key_person_contact2 TEXT,
  
  -- Initial Visit Date (初回訪問年月日)
  initial_visit_date DATE,
  initial_visit_year INTEGER,
  initial_visit_month INTEGER,
  initial_visit_day INTEGER,
  initial_visit_day_of_week TEXT,
  initial_visit_start_hour INTEGER,
  initial_visit_start_minute INTEGER,
  initial_visit_end_hour INTEGER,
  initial_visit_end_minute INTEGER,
  
  -- Medical Information
  main_disease TEXT, -- 主たる傷病名
  medical_history TEXT, -- 既往歴
  current_illness_history TEXT, -- 現病歴
  family_structure TEXT, -- 家族構成
  
  -- Daily Life Status (日常生活状況)
  daily_life_meal_nutrition TEXT, -- 食事・栄養
  daily_life_hygiene TEXT, -- 清潔・整容
  daily_life_medication TEXT, -- 服薬
  daily_life_sleep TEXT, -- 睡眠
  daily_life_living_environment TEXT, -- 生活環境
  daily_life_family_environment TEXT, -- 家族環境
  
  -- Primary Doctor Information (主治医)
  doctor_name TEXT,
  hospital_name TEXT,
  hospital_address TEXT,
  hospital_phone TEXT,
  
  -- Additional Information
  notes TEXT, -- 備考
  recorder_name TEXT, -- 記載者
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'inactive', 'archived'
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_visit_records_user_id ON public.visit_records(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_patient_id ON public.visit_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_visit_records_created_at ON public.visit_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visit_records_initial_visit_date ON public.visit_records(initial_visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visit_records_status ON public.visit_records(status);

-- Add check constraint for status
ALTER TABLE public.visit_records
ADD CONSTRAINT visit_records_status_check CHECK (status IN ('active', 'inactive', 'archived'));

-- Add check constraint for gender
ALTER TABLE public.visit_records
ADD CONSTRAINT visit_records_gender_check CHECK (gender IN ('male', 'female', NULL));

-- Enable Row Level Security (RLS)
ALTER TABLE public.visit_records ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own visit records
CREATE POLICY "Users can view their own visit records"
  ON public.visit_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own visit records
CREATE POLICY "Users can insert their own visit records"
  ON public.visit_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create policy: Users can update their own visit records
CREATE POLICY "Users can update their own visit records"
  ON public.visit_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own visit records
CREATE POLICY "Users can delete their own visit records"
  ON public.visit_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_visit_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visit_records_updated_at
  BEFORE UPDATE ON public.visit_records
  FOR EACH ROW
  EXECUTE FUNCTION update_visit_records_updated_at();

-- Add comment to table
COMMENT ON TABLE public.visit_records IS 'Stores detailed patient visit record information (精神科訪問看護記録書Ⅰ)';
