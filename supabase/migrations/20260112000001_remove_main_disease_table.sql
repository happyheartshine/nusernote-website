-- Migration: Remove main_disease table and all references
-- This migration removes the main_disease table and all foreign key references to it

-- Step 1: Drop foreign key constraint and column from soap_records
ALTER TABLE public.soap_records
DROP CONSTRAINT IF EXISTS soap_records_main_disease_id_fkey;

DROP INDEX IF EXISTS idx_soap_records_main_disease_id;

ALTER TABLE public.soap_records
DROP COLUMN IF EXISTS main_disease_id;

-- Step 2: Drop foreign key constraint and column from patients
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS patients_main_disease_id_fkey;

DROP INDEX IF EXISTS idx_patients_main_disease_id;

ALTER TABLE public.patients
DROP COLUMN IF EXISTS main_disease_id;

-- Step 3: Drop RLS policies on main_disease table
DROP POLICY IF EXISTS "Users can view their own main diseases" ON public.main_disease;
DROP POLICY IF EXISTS "Users can insert their own main diseases" ON public.main_disease;
DROP POLICY IF EXISTS "Users can update their own main diseases" ON public.main_disease;
DROP POLICY IF EXISTS "Users can delete their own main diseases" ON public.main_disease;

-- Step 4: Drop trigger on main_disease table
DROP TRIGGER IF EXISTS update_main_disease_updated_at ON public.main_disease;

-- Step 5: Drop indexes on main_disease table
DROP INDEX IF EXISTS idx_main_disease_user_id;
DROP INDEX IF EXISTS idx_main_disease_name;
DROP INDEX IF EXISTS idx_main_disease_status;
DROP INDEX IF EXISTS idx_main_disease_created_at;

-- Step 6: Drop the main_disease table
DROP TABLE IF EXISTS public.main_disease;

-- Comments
COMMENT ON COLUMN public.patients.primary_diagnosis IS 'Primary diagnosis (主疾患) - text field';
COMMENT ON COLUMN public.soap_records.diagnosis IS 'Diagnosis text field';
