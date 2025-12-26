-- Migration: Update soap_records RLS policies to require approval status
-- This ensures only approved users can access soap_records

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own records" ON public.soap_records;
DROP POLICY IF EXISTS "Users can insert their own records" ON public.soap_records;
DROP POLICY IF EXISTS "Users can update their own records" ON public.soap_records;
DROP POLICY IF EXISTS "Users can delete their own records" ON public.soap_records;
DROP POLICY IF EXISTS "Admins can view all records" ON public.soap_records;

-- Policy: Approved nurses can view their own records
CREATE POLICY "Approved nurses can view their own records"
  ON public.soap_records
  FOR SELECT
  USING (
    public.is_approved(auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Approved admins can view all records
CREATE POLICY "Approved admins can view all records"
  ON public.soap_records
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Policy: Approved users can insert their own records
-- Note: Service role can still insert via backend (bypasses RLS)
CREATE POLICY "Approved users can insert their own records"
  ON public.soap_records
  FOR INSERT
  WITH CHECK (
    public.is_approved(auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Approved nurses can update their own records
CREATE POLICY "Approved nurses can update their own records"
  ON public.soap_records
  FOR UPDATE
  USING (
    public.is_approved(auth.uid())
    AND auth.uid() = user_id
  )
  WITH CHECK (
    public.is_approved(auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Approved admins can update all records
CREATE POLICY "Approved admins can update all records"
  ON public.soap_records
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Policy: Approved nurses can delete their own records
CREATE POLICY "Approved nurses can delete their own records"
  ON public.soap_records
  FOR DELETE
  USING (
    public.is_approved(auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Approved admins can delete all records
CREATE POLICY "Approved admins can delete all records"
  ON public.soap_records
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Add comments
COMMENT ON POLICY "Approved nurses can view their own records" ON public.soap_records IS 'Approved nurses can view only their own soap records';
COMMENT ON POLICY "Approved admins can view all records" ON public.soap_records IS 'Approved admins can view all soap records';
COMMENT ON POLICY "Approved users can insert their own records" ON public.soap_records IS 'Only approved users can create new soap records';
COMMENT ON POLICY "Approved nurses can update their own records" ON public.soap_records IS 'Approved nurses can update only their own records';
COMMENT ON POLICY "Approved admins can update all records" ON public.soap_records IS 'Approved admins can update any soap record';
COMMENT ON POLICY "Approved nurses can delete their own records" ON public.soap_records IS 'Approved nurses can delete only their own records';
COMMENT ON POLICY "Approved admins can delete all records" ON public.soap_records IS 'Approved admins can delete any soap record';

