-- Migration: Add missing patient fields to match frontend form
-- This migration adds all fields that are used in the patients page form

-- Add patient basic information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact TEXT;

-- Add key person information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS key_person_name TEXT,
ADD COLUMN IF NOT EXISTS key_person_relationship TEXT,
ADD COLUMN IF NOT EXISTS key_person_address TEXT,
ADD COLUMN IF NOT EXISTS key_person_contact1 TEXT,
ADD COLUMN IF NOT EXISTS key_person_contact2 TEXT;

-- Add initial visit information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS initial_visit_date DATE,
ADD COLUMN IF NOT EXISTS initial_visit_start_hour INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_start_minute INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_end_hour INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_end_minute INTEGER;

-- Add medical information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS current_illness_history TEXT,
ADD COLUMN IF NOT EXISTS family_structure TEXT;

-- Add daily life status fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS daily_life_meal_nutrition TEXT,
ADD COLUMN IF NOT EXISTS daily_life_hygiene TEXT,
ADD COLUMN IF NOT EXISTS daily_life_medication TEXT,
ADD COLUMN IF NOT EXISTS daily_life_sleep TEXT,
ADD COLUMN IF NOT EXISTS daily_life_living_environment TEXT,
ADD COLUMN IF NOT EXISTS daily_life_family_environment TEXT;

-- Add doctor/hospital information fields
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS doctor_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_address TEXT,
ADD COLUMN IF NOT EXISTS hospital_phone TEXT;

-- Add recorder information field
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS recorder_name TEXT;

-- Add check constraints for time fields
ALTER TABLE public.patients
ADD CONSTRAINT patients_initial_visit_start_hour_check CHECK (
  initial_visit_start_hour IS NULL OR (initial_visit_start_hour >= 0 AND initial_visit_start_hour <= 23)
),
ADD CONSTRAINT patients_initial_visit_start_minute_check CHECK (
  initial_visit_start_minute IS NULL OR (initial_visit_start_minute >= 0 AND initial_visit_start_minute <= 59)
),
ADD CONSTRAINT patients_initial_visit_end_hour_check CHECK (
  initial_visit_end_hour IS NULL OR (initial_visit_end_hour >= 0 AND initial_visit_end_hour <= 23)
),
ADD CONSTRAINT patients_initial_visit_end_minute_check CHECK (
  initial_visit_end_minute IS NULL OR (initial_visit_end_minute >= 0 AND initial_visit_end_minute <= 59)
);

-- Add comments for documentation
COMMENT ON COLUMN public.patients.birth_date IS '生年月日';
COMMENT ON COLUMN public.patients.address IS '住所';
COMMENT ON COLUMN public.patients.contact IS '連絡先';
COMMENT ON COLUMN public.patients.key_person_name IS 'キーパーソン氏名';
COMMENT ON COLUMN public.patients.key_person_relationship IS 'キーパーソン続柄';
COMMENT ON COLUMN public.patients.key_person_address IS 'キーパーソン住所';
COMMENT ON COLUMN public.patients.key_person_contact1 IS 'キーパーソン連絡先1';
COMMENT ON COLUMN public.patients.key_person_contact2 IS 'キーパーソン連絡先2';
COMMENT ON COLUMN public.patients.initial_visit_date IS '初回訪問日';
COMMENT ON COLUMN public.patients.initial_visit_start_hour IS '初回訪問開始時 (0-23)';
COMMENT ON COLUMN public.patients.initial_visit_start_minute IS '初回訪問開始分 (0-59)';
COMMENT ON COLUMN public.patients.initial_visit_end_hour IS '初回訪問終了時 (0-23)';
COMMENT ON COLUMN public.patients.initial_visit_end_minute IS '初回訪問終了分 (0-59)';
COMMENT ON COLUMN public.patients.medical_history IS '既往歴';
COMMENT ON COLUMN public.patients.current_illness_history IS '現病歴';
COMMENT ON COLUMN public.patients.family_structure IS '家族構成';
COMMENT ON COLUMN public.patients.daily_life_meal_nutrition IS '日常生活状況 - 食事・栄養';
COMMENT ON COLUMN public.patients.daily_life_hygiene IS '日常生活状況 - 清潔・整容';
COMMENT ON COLUMN public.patients.daily_life_medication IS '日常生活状況 - 服薬';
COMMENT ON COLUMN public.patients.daily_life_sleep IS '日常生活状況 - 睡眠';
COMMENT ON COLUMN public.patients.daily_life_living_environment IS '日常生活状況 - 生活環境';
COMMENT ON COLUMN public.patients.daily_life_family_environment IS '日常生活状況 - 家族環境';
COMMENT ON COLUMN public.patients.doctor_name IS '主治医氏名';
COMMENT ON COLUMN public.patients.hospital_name IS '医療機関名';
COMMENT ON COLUMN public.patients.hospital_address IS '医療機関所在地';
COMMENT ON COLUMN public.patients.hospital_phone IS '医療機関電話番号';
COMMENT ON COLUMN public.patients.recorder_name IS '記載者';
