-- Migration: Update foreign key constraints to CASCADE for patient deletion
-- This allows deletion of patients and automatically deletes associated records

-- Step 1: Drop and recreate soap_records patient_id foreign key constraint with CASCADE
ALTER TABLE public.soap_records
DROP CONSTRAINT IF EXISTS soap_records_patient_id_fkey;

ALTER TABLE public.soap_records
ADD CONSTRAINT soap_records_patient_id_fkey
FOREIGN KEY (patient_id)
REFERENCES public.patients(id)
ON DELETE CASCADE;

-- Step 2: Verify plans table already has CASCADE (it should from the original migration)
-- The plans table was created with ON DELETE CASCADE, so no change needed
-- But we'll add a comment for clarity

-- Comments
COMMENT ON CONSTRAINT soap_records_patient_id_fkey ON public.soap_records IS 
'Foreign key to patients table. Deletes associated SOAP records when patient is deleted.';
