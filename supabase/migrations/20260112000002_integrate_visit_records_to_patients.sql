-- Migration: Integrate visit_records fields into patients table
-- This migration adds patient-related fields from visit_records to the patients table
-- and removes duplicate patient information from visit_records

-- Step 1: Add missing patient fields to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_date_year INTEGER,
ADD COLUMN IF NOT EXISTS birth_date_month INTEGER,
ADD COLUMN IF NOT EXISTS birth_date_day INTEGER,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact TEXT,
ADD COLUMN IF NOT EXISTS key_person_name TEXT,
ADD COLUMN IF NOT EXISTS key_person_relationship TEXT,
ADD COLUMN IF NOT EXISTS key_person_address TEXT,
ADD COLUMN IF NOT EXISTS key_person_contact1 TEXT,
ADD COLUMN IF NOT EXISTS key_person_contact2 TEXT,
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS current_illness_history TEXT,
ADD COLUMN IF NOT EXISTS family_structure TEXT,
ADD COLUMN IF NOT EXISTS doctor_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS hospital_address TEXT,
ADD COLUMN IF NOT EXISTS hospital_phone TEXT,
ADD COLUMN IF NOT EXISTS initial_visit_date DATE,
ADD COLUMN IF NOT EXISTS initial_visit_year INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_month INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_day INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_day_of_week TEXT,
ADD COLUMN IF NOT EXISTS initial_visit_start_hour INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_start_minute INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_end_hour INTEGER,
ADD COLUMN IF NOT EXISTS initial_visit_end_minute INTEGER;

-- Step 2: Add comments for new patient fields
COMMENT ON COLUMN public.patients.birth_date IS 'Patient birth date';
COMMENT ON COLUMN public.patients.birth_date_year IS 'Patient birth year';
COMMENT ON COLUMN public.patients.birth_date_month IS 'Patient birth month';
COMMENT ON COLUMN public.patients.birth_date_day IS 'Patient birth day';
COMMENT ON COLUMN public.patients.address IS 'Patient address (住所)';
COMMENT ON COLUMN public.patients.contact IS 'Patient contact information (連絡先)';
COMMENT ON COLUMN public.patients.key_person_name IS 'Key person name (キーパーソン名)';
COMMENT ON COLUMN public.patients.key_person_relationship IS 'Key person relationship (続柄)';
COMMENT ON COLUMN public.patients.key_person_address IS 'Key person address';
COMMENT ON COLUMN public.patients.key_person_contact1 IS 'Key person contact 1';
COMMENT ON COLUMN public.patients.key_person_contact2 IS 'Key person contact 2';
COMMENT ON COLUMN public.patients.medical_history IS 'Medical history (既往歴)';
COMMENT ON COLUMN public.patients.current_illness_history IS 'Current illness history (現病歴)';
COMMENT ON COLUMN public.patients.family_structure IS 'Family structure (家族構成)';
COMMENT ON COLUMN public.patients.doctor_name IS 'Primary doctor name (主治医名)';
COMMENT ON COLUMN public.patients.hospital_name IS 'Hospital name (病院名)';
COMMENT ON COLUMN public.patients.hospital_address IS 'Hospital address (病院住所)';
COMMENT ON COLUMN public.patients.hospital_phone IS 'Hospital phone (病院電話)';
COMMENT ON COLUMN public.patients.initial_visit_date IS 'Initial visit date (初回訪問年月日)';
COMMENT ON COLUMN public.patients.initial_visit_year IS 'Initial visit year';
COMMENT ON COLUMN public.patients.initial_visit_month IS 'Initial visit month';
COMMENT ON COLUMN public.patients.initial_visit_day IS 'Initial visit day';
COMMENT ON COLUMN public.patients.initial_visit_day_of_week IS 'Initial visit day of week';
COMMENT ON COLUMN public.patients.initial_visit_start_hour IS 'Initial visit start hour';
COMMENT ON COLUMN public.patients.initial_visit_start_minute IS 'Initial visit start minute';
COMMENT ON COLUMN public.patients.initial_visit_end_hour IS 'Initial visit end hour';
COMMENT ON COLUMN public.patients.initial_visit_end_minute IS 'Initial visit end minute';

-- Step 3: Remove duplicate patient fields from visit_records
-- Keep only visit-specific information
ALTER TABLE public.visit_records
DROP COLUMN IF EXISTS patient_name,
DROP COLUMN IF EXISTS gender,
DROP COLUMN IF EXISTS birth_date,
DROP COLUMN IF EXISTS birth_date_year,
DROP COLUMN IF EXISTS birth_date_month,
DROP COLUMN IF EXISTS birth_date_day,
DROP COLUMN IF EXISTS age,
DROP COLUMN IF EXISTS patient_address,
DROP COLUMN IF EXISTS patient_contact,
DROP COLUMN IF EXISTS key_person_name,
DROP COLUMN IF EXISTS key_person_relationship,
DROP COLUMN IF EXISTS key_person_address,
DROP COLUMN IF EXISTS key_person_contact1,
DROP COLUMN IF EXISTS key_person_contact2,
DROP COLUMN IF EXISTS initial_visit_date,
DROP COLUMN IF EXISTS initial_visit_year,
DROP COLUMN IF EXISTS initial_visit_month,
DROP COLUMN IF EXISTS initial_visit_day,
DROP COLUMN IF EXISTS initial_visit_day_of_week,
DROP COLUMN IF EXISTS initial_visit_start_hour,
DROP COLUMN IF EXISTS initial_visit_start_minute,
DROP COLUMN IF EXISTS initial_visit_end_hour,
DROP COLUMN IF EXISTS initial_visit_end_minute,
DROP COLUMN IF EXISTS main_disease,
DROP COLUMN IF EXISTS medical_history,
DROP COLUMN IF EXISTS current_illness_history,
DROP COLUMN IF EXISTS family_structure,
DROP COLUMN IF EXISTS doctor_name,
DROP COLUMN IF EXISTS hospital_name,
DROP COLUMN IF EXISTS hospital_address,
DROP COLUMN IF EXISTS hospital_phone;

-- Step 4: Add visit-specific fields to visit_records (if needed for future visits)
-- These fields can be added per visit record
ALTER TABLE public.visit_records
ADD COLUMN IF NOT EXISTS visit_date DATE,
ADD COLUMN IF NOT EXISTS visit_start_hour INTEGER,
ADD COLUMN IF NOT EXISTS visit_start_minute INTEGER,
ADD COLUMN IF NOT EXISTS visit_end_hour INTEGER,
ADD COLUMN IF NOT EXISTS visit_end_minute INTEGER;

-- Step 5: Update comments
COMMENT ON TABLE public.visit_records IS 'Stores visit-specific information for patient visits. Patient information is now stored in the patients table.';
COMMENT ON COLUMN public.visit_records.visit_date IS 'Visit date for this specific visit';
COMMENT ON COLUMN public.visit_records.visit_start_hour IS 'Visit start hour';
COMMENT ON COLUMN public.visit_records.visit_start_minute IS 'Visit start minute';
COMMENT ON COLUMN public.visit_records.visit_end_hour IS 'Visit end hour';
COMMENT ON COLUMN public.visit_records.visit_end_minute IS 'Visit end minute';

-- Step 6: Create index on visit_date for faster queries
CREATE INDEX IF NOT EXISTS idx_visit_records_visit_date ON public.visit_records(visit_date DESC);

-- Step 7: Drop old index that referenced initial_visit_date
DROP INDEX IF EXISTS idx_visit_records_initial_visit_date;
