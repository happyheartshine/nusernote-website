-- Supabase Database Schema for SOAP Records
-- Run this SQL in your Supabase SQL Editor to create the table

-- Create the soap_records table
CREATE TABLE IF NOT EXISTS soap_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Patient Information
  patient_name TEXT NOT NULL,
  diagnosis TEXT,
  
  -- Visit Information
  visit_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  nurses TEXT[] DEFAULT '{}',
  chief_complaint TEXT,
  
  -- Input Data
  s_text TEXT, -- Subjective input
  o_text TEXT, -- Objective input
  
  -- Generated SOAP Output (stored as JSONB for flexibility)
  soap_output JSONB,
  plan_output JSONB,
  
  -- Metadata
  notes TEXT
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_soap_records_user_id ON soap_records(user_id);

-- Create index on visit_date for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_soap_records_visit_date ON soap_records(visit_date DESC);

-- Create index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_soap_records_created_at ON soap_records(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE soap_records ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own records
CREATE POLICY "Users can view their own records"
  ON soap_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own records
-- Note: Service role key bypasses RLS, but this policy allows authenticated users to insert
CREATE POLICY "Users can insert their own records"
  ON soap_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Create policy: Users can update their own records
CREATE POLICY "Users can update their own records"
  ON soap_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own records
CREATE POLICY "Users can delete their own records"
  ON soap_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_soap_records_updated_at
  BEFORE UPDATE ON soap_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

