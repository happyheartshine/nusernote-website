# Signup Error Fix - Summary

## Problem Identified ✅

**Error:** `Database error saving new user` when users try to sign up

**Root Cause:** The RLS (Row Level Security) policy on the `profiles` table had an INSERT policy with `WITH CHECK (false)` that blocked ALL inserts, including those from the database trigger that's supposed to automatically create user profiles.

## Files Changed

### 1. Migration Files Updated
- ✅ `supabase/migrations/20231225000002_create_profile_trigger.sql`
  - Updated trigger function to use `SECURITY DEFINER` with `SET search_path = public`
  - Added proper GRANT statements for function execution
  
- ✅ `supabase/migrations/20231225000004_create_profiles_rls_policies.sql`
  - Removed the blocking INSERT policy that prevented trigger from working
  - Added explanatory comment about why no INSERT policy is needed

### 2. New Hotfix Migration Created
- ✅ `supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql`
  - Standalone migration that can be applied to fix existing deployments
  - Drops the problematic policy
  - Recreates the trigger function with proper security settings
  - Adds necessary grants

### 3. Documentation Created
- ✅ `supabase/HOTFIX_SIGNUP_ERROR.md`
  - Comprehensive guide explaining the problem and solution
  - Multiple options for applying the fix (CLI, Manual SQL, Quick Fix)
  - Verification steps and troubleshooting

### 4. Helper Scripts Created
- ✅ `supabase/apply-hotfix.ps1` (Windows PowerShell)
- ✅ `supabase/apply-hotfix.sh` (Linux/Mac Bash)
  - Interactive scripts that guide you through applying the fix
  - Check for Supabase CLI installation
  - Handle project linking if needed
  - Apply the migration automatically

## How to Apply the Fix

### Option 1: Quick Script (Easiest)

**Windows (PowerShell):**
```powershell
cd supabase
.\apply-hotfix.ps1
```

**Linux/Mac (Bash):**
```bash
cd supabase
chmod +x apply-hotfix.sh
./apply-hotfix.sh
```

### Option 2: Manual with Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Option 3: Copy-Paste SQL (No CLI needed)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (ref: `skqlxkmramgzdqjjqrui`)
3. Navigate to **SQL Editor**
4. Copy contents of `supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql`
5. Paste and run

### Option 4: Ultra-Quick SQL Fix

Just run this in Supabase SQL Editor:

```sql
DROP POLICY IF EXISTS "Only system can insert profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'nurse', 'pending');
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
```

## Technical Details

### What Was Wrong

The `handle_new_user()` trigger function was marked as `SECURITY DEFINER`, which should allow it to bypass RLS. However:

1. The INSERT policy `WITH CHECK (false)` explicitly blocked ALL inserts
2. Even `SECURITY DEFINER` functions respect RLS policies when RLS is enabled
3. The function needed `SET search_path = public` for proper security

### What's Fixed

1. **Removed blocking INSERT policy** - No INSERT policy is needed because:
   - Only the trigger can insert (it runs as `SECURITY DEFINER`)
   - Regular users can't directly insert into `profiles` anyway (no policy allowing it)
   - Other policies (SELECT, UPDATE, DELETE) still protect the table

2. **Enhanced trigger function security**:
   - Added `SET search_path = public` to prevent schema injection attacks
   - Properly formatted with SECURITY DEFINER
   - Added explicit GRANTs for execution

3. **Maintained security**:
   - RLS is still enabled on profiles table
   - Users still can't directly manipulate profiles
   - Only SELECT, UPDATE, DELETE policies are needed
   - Trigger bypasses RLS safely to create profiles

## Testing the Fix

After applying, test signup:

1. Go to your registration page
2. Create a new test account
3. Should see success (no 500 error)
4. New user should be redirected to "pending approval" page
5. Check Supabase Dashboard → Authentication → Users - new user should appear
6. Check Supabase Dashboard → Table Editor → profiles - new profile should exist with:
   - `role: 'nurse'`
   - `status: 'pending'`

## Verification Queries

Run these in SQL Editor to verify everything is correct:

```sql
-- Check if blocking policy is gone
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Only system can insert profiles';
-- Should return no rows

-- Check trigger exists and is active
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Should return 1 row with tgenabled = 'O' (enabled)

-- Check function has SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';
-- prosecdef should be 't' (true)

-- Check existing policies (should be 5 total: 2 SELECT, 2 UPDATE, 1 DELETE)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
```

## Next Steps

After the fix is applied and tested:

1. ✅ Signup should work properly
2. ✅ New users get 'pending' status automatically
3. ✅ Pending users see approval waiting screen
4. ✅ Admin can approve users from admin panel
5. ✅ Approved users can access the dashboard

## Need Help?

If signup still fails after applying the fix:

1. Check Supabase logs: Dashboard → Logs → Database
2. Look for specific error messages during signup attempts
3. Run the verification queries above
4. Check that your `.env.local` has correct Supabase URL and keys

## Prevention

To avoid this issue in future migrations:

1. ✅ Test triggers in a staging environment first
2. ✅ Remember that `SECURITY DEFINER` functions still respect RLS
3. ✅ Use `SET search_path` with `SECURITY DEFINER` for security
4. ✅ Don't create INSERT policies with `WITH CHECK (false)` when triggers need to insert
5. ✅ Document why policies exist (or don't exist)

