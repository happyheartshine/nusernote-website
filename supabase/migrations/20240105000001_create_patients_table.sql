-- Migration: Create patients (利用者) table
-- This table stores fixed baseline patient information

-- Create the patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Patient Information
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  primary_diagnosis TEXT,
  individual_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Ensure unique patient names per user (optional constraint)
  CONSTRAINT patients_user_name_unique UNIQUE (user_id, name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON public.patients(created_at DESC);

-- Add check constraint for status
ALTER TABLE public.patients
ADD CONSTRAINT patients_status_check CHECK (status IN ('active', 'inactive', 'archived'));

-- Enable Row Level Security (RLS)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own patients
CREATE POLICY "Users can view their own patients"
  ON public.patients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own patients
CREATE POLICY "Users can insert their own patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create policy: Users can update their own patients
CREATE POLICY "Users can update their own patients"
  ON public.patients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own patients
CREATE POLICY "Users can delete their own patients"
  ON public.patients
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.patients IS 'Fixed baseline patient information (利用者)';
COMMENT ON COLUMN public.patients.name IS 'Patient name (利用者名)';
COMMENT ON COLUMN public.patients.age IS 'Patient age';
COMMENT ON COLUMN public.patients.gender IS 'Patient gender';
COMMENT ON COLUMN public.patients.primary_diagnosis IS 'Primary diagnosis (主疾患)';
COMMENT ON COLUMN public.patients.individual_notes IS 'Individual notes for the patient';
COMMENT ON COLUMN public.patients.status IS 'Patient status: active, inactive, or archived';

