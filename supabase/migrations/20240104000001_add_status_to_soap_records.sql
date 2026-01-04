-- Migration: Add status column to soap_records table
-- This allows tracking whether a record is in draft or confirmed state

-- Add status column with default value 'draft'
ALTER TABLE public.soap_records
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Add check constraint to ensure status is either 'draft' or 'confirmed'
ALTER TABLE public.soap_records
ADD CONSTRAINT soap_records_status_check CHECK (status IN ('draft', 'confirmed'));

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_soap_records_status ON public.soap_records(status);

-- Comment on column
COMMENT ON COLUMN public.soap_records.status IS 'Record status: draft (editable) or confirmed (read-only)';

