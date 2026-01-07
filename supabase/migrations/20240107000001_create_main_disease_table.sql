-- Migration: Create main_disease (主疾患) table
-- This table stores main diseases/diagnoses that can be referenced in soap_records

-- Create the main_disease table
CREATE TABLE IF NOT EXISTS public.main_disease (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Disease Information
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Ensure unique disease names per user
  CONSTRAINT main_disease_user_name_unique UNIQUE (user_id, name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_main_disease_user_id ON public.main_disease(user_id);
CREATE INDEX IF NOT EXISTS idx_main_disease_name ON public.main_disease(name);
CREATE INDEX IF NOT EXISTS idx_main_disease_status ON public.main_disease(status);
CREATE INDEX IF NOT EXISTS idx_main_disease_created_at ON public.main_disease(created_at DESC);

-- Add check constraint for status
ALTER TABLE public.main_disease
ADD CONSTRAINT main_disease_status_check CHECK (status IN ('active', 'inactive', 'archived'));

-- Enable Row Level Security (RLS)
ALTER TABLE public.main_disease ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own main diseases
CREATE POLICY "Users can view their own main diseases"
  ON public.main_disease
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own main diseases
CREATE POLICY "Users can insert their own main diseases"
  ON public.main_disease
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create policy: Users can update their own main diseases
CREATE POLICY "Users can update their own main diseases"
  ON public.main_disease
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own main diseases
CREATE POLICY "Users can delete their own main diseases"
  ON public.main_disease
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_main_disease_updated_at
  BEFORE UPDATE ON public.main_disease
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.main_disease IS 'Main diseases/diagnoses (主疾患) that can be referenced in soap_records';
COMMENT ON COLUMN public.main_disease.name IS 'Disease name (疾患名)';
COMMENT ON COLUMN public.main_disease.description IS 'Disease description';
COMMENT ON COLUMN public.main_disease.status IS 'Disease status: active, inactive, or archived';

