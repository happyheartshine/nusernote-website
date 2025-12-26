-- Migration: Enable RLS and create policies for profiles table
-- This ensures proper access control for user profiles

-- Enable Row Level Security on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile role and status" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Policy: Users can update their own profile fields (but NOT role or status)
-- This policy allows users to update name, birthday, gender, address
CREATE POLICY "Users can update their own profile fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Ensure user cannot change their own role or status
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );

-- Policy: Admins can update any profile's role and status
CREATE POLICY "Admins can update any profile role and status"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Note: No INSERT policy needed
-- The trigger function handle_new_user() uses SECURITY DEFINER and bypasses RLS
-- This effectively prevents direct user inserts while allowing the trigger to work

-- Policy: Prevent profile deletion
-- Profiles should cascade delete when auth.users is deleted
CREATE POLICY "Prevent direct profile deletion"
  ON public.profiles
  FOR DELETE
  USING (false);

-- Add comments
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 'Users can read their own profile data';
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Admins with approved status can read all profiles';
COMMENT ON POLICY "Users can update their own profile fields" ON public.profiles IS 'Users can update their own name, birthday, gender, address but not role or status';
COMMENT ON POLICY "Admins can update any profile role and status" ON public.profiles IS 'Admins can update role and status for any user';

