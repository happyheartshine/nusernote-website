-- Migration: Hotfix for profile INSERT policy blocking trigger
-- This removes the blocking INSERT policy that prevents the trigger from creating profiles

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Only system can insert profiles" ON public.profiles;

-- Note: No INSERT policy is needed for profiles table
-- The trigger function handle_new_user() uses SECURITY DEFINER with SET search_path
-- which allows it to bypass RLS when creating profiles
-- This effectively prevents direct user inserts while allowing the trigger to work

-- Recreate the trigger function with proper security settings if it doesn't already have them
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    'nurse', -- Default role is nurse
    'pending' -- Default status is pending (requires admin approval)
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists, do nothing
    RETURN NEW;
END;
$$;

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile with default nurse role and pending status when a new user signs up. Uses SECURITY DEFINER to bypass RLS.';

