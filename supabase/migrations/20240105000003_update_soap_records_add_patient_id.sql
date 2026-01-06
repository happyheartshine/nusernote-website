-- Migration: Update soap_records to use patient_id foreign key
-- Remove embedded patient_name and diagnosis fields, replace with patient_id reference

-- Step 1: Add patient_id column (nullable initially for migration)
ALTER TABLE public.soap_records
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id) ON DELETE RESTRICT;

-- Step 2: Create index on patient_id
CREATE INDEX IF NOT EXISTS idx_soap_records_patient_id ON public.soap_records(patient_id);

-- Step 3: Note: For existing data, you would need to:
-- 1. Create patient records from existing patient_name/diagnosis combinations
-- 2. Update soap_records.patient_id to reference the new patient records
-- 3. Then make patient_id NOT NULL and drop patient_name/diagnosis columns
--
-- For now, we keep patient_name and diagnosis for backward compatibility
-- They will be removed in a future migration after data migration is complete

-- Step 4: Update RLS policies to include patient access check
-- Users should be able to access soap_records if they own the patient
-- This is already covered by user_id, but we add a comment for clarity

-- Comments
COMMENT ON COLUMN public.soap_records.patient_id IS 'Foreign key to patients table (replaces embedded patient_name and diagnosis)';

