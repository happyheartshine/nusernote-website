-- Migration: Create trigger to auto-create profile on user signup
-- This trigger automatically creates a profile record when a new user signs up via auth.users

-- Create function to handle new user profile creation
-- SECURITY DEFINER allows the function to run with elevated privileges
-- SET search_path ensures security and prevents malicious schema injection
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

-- Create trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile with default nurse role and pending status when a new user signs up';

