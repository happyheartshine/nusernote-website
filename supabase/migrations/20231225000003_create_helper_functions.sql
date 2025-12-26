-- Migration: Create helper functions for role and approval checks
-- These functions are used in RLS policies to check user permissions

-- Function to check if a user is an admin with approved status
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'admin'
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if a user has approved status (any role)
CREATE OR REPLACE FUNCTION public.is_approved(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT role
  FROM public.profiles
  WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to get current user's status
CREATE OR REPLACE FUNCTION public.get_user_status(uid UUID)
RETURNS TEXT AS $$
  SELECT status
  FROM public.profiles
  WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Add comments
COMMENT ON FUNCTION public.is_admin IS 'Returns true if the user has admin role and approved status';
COMMENT ON FUNCTION public.is_approved IS 'Returns true if the user has approved status (any role)';
COMMENT ON FUNCTION public.get_user_role IS 'Returns the role of the specified user';
COMMENT ON FUNCTION public.get_user_status IS 'Returns the approval status of the specified user';

