-- Migration: Backfill profiles for existing auth.users
-- This creates profile records for any existing users who signed up before the profile system was implemented

-- Insert profiles for existing auth.users that don't have a profile yet
INSERT INTO public.profiles (id, email, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'nurse' AS role, -- Default to nurse role
  'pending' AS status, -- Default to pending (admin can approve later)
  au.created_at,
  au.created_at AS updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Only insert if profile doesn't exist
ON CONFLICT (id) DO NOTHING; -- Skip if profile already exists

-- Optional: Create the first admin user
-- Uncomment and replace the email with your admin email address
-- UPDATE public.profiles
-- SET role = 'admin', status = 'approved'
-- WHERE email = 'admin@example.com';

-- Add comment
COMMENT ON TABLE public.profiles IS 'Backfill complete: All existing auth.users now have corresponding profile records';

