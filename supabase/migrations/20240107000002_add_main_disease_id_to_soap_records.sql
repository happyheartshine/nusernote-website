-- Migration: Add main_disease_id to soap_records table
-- This allows soap_records to reference main_disease instead of using diagnosis text field

-- Step 1: Add main_disease_id column (nullable initially for migration)
ALTER TABLE public.soap_records
ADD COLUMN IF NOT EXISTS main_disease_id UUID REFERENCES public.main_disease(id) ON DELETE SET NULL;

-- Step 2: Create index on main_disease_id
CREATE INDEX IF NOT EXISTS idx_soap_records_main_disease_id ON public.soap_records(main_disease_id);

-- Comments
COMMENT ON COLUMN public.soap_records.main_disease_id IS 'Foreign key to main_disease table (replaces diagnosis text field)';
COMMENT ON COLUMN public.soap_records.diagnosis IS 'Kept for backward compatibility. Use main_disease_id instead.';

