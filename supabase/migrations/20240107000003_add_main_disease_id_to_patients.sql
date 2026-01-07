-- Migration: Add main_disease_id to patients table
-- This replaces the primary_diagnosis text field with a foreign key reference to main_disease

-- Step 1: Add main_disease_id column (nullable initially for migration)
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS main_disease_id UUID REFERENCES public.main_disease(id) ON DELETE SET NULL;

-- Step 2: Create index on main_disease_id
CREATE INDEX IF NOT EXISTS idx_patients_main_disease_id ON public.patients(main_disease_id);

-- Comments
COMMENT ON COLUMN public.patients.main_disease_id IS 'Foreign key to main_disease table (replaces primary_diagnosis text field)';
COMMENT ON COLUMN public.patients.primary_diagnosis IS 'Kept for backward compatibility. Use main_disease_id instead.';

