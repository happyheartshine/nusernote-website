# URGENT: Hotfix for Signup Error

## Problem
User signup is failing with "Database error saving new user" because an RLS policy is blocking the trigger from creating profile records.

## Root Cause
The migration `20231225000004_create_profiles_rls_policies.sql` created an INSERT policy with `WITH CHECK (false)` that blocks ALL inserts to the profiles table, including inserts from the `handle_new_user()` trigger.

## Solution
Apply the hotfix migration that:
1. Removes the blocking INSERT policy
2. Updates the trigger function to use `SECURITY DEFINER` with `SET search_path` to properly bypass RLS

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended - Fastest)

```bash
# If you haven't already, login and link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Apply the hotfix migration
supabase db push
```

This will apply only the new migration: `20231225000007_hotfix_profile_insert_policy.sql`

### Option 2: Manual SQL Execution (If CLI isn't available)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project (looks like it's: skqlxkmramgzdqjjqrui)
3. Navigate to: **SQL Editor**
4. Click **New Query**
5. Copy and paste the ENTIRE contents of:
   ```
   supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql
   ```
6. Click **Run** (or press Ctrl+Enter)
7. Verify you see "Success. No rows returned"

### Option 3: Quick Fix via SQL Editor (Minimal - Just to Unblock)

If you need to unblock signup immediately, run this in the SQL Editor:

```sql
-- Remove the blocking policy
DROP POLICY IF EXISTS "Only system can insert profiles" ON public.profiles;

-- Recreate the trigger function with proper security
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
    'nurse',
    'pending'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
```

## Verify the Fix

After applying, test signup:

1. Go to your registration page
2. Try to create a new account
3. Signup should now succeed
4. The user should be redirected to the pending approval page

## Technical Details

### What Changed

**Before (Broken):**
- RLS INSERT policy: `WITH CHECK (false)` blocked ALL inserts
- Trigger function couldn't create profiles despite `SECURITY DEFINER`

**After (Fixed):**
- No INSERT policy on profiles table (RLS still enabled for SELECT/UPDATE/DELETE)
- Trigger function uses `SECURITY DEFINER` + `SET search_path` to bypass RLS
- Only the system trigger can create profiles; users cannot directly INSERT

### Why This Is Secure

Even without an INSERT policy:
- RLS is still enabled on the profiles table
- Users cannot directly insert into profiles (they'd need the authenticated role to do so, and there's no policy allowing it)
- Only the trigger (running as SECURITY DEFINER) can insert
- SELECT, UPDATE, and DELETE policies still enforce access control

### Files Modified

1. `supabase/migrations/20231225000002_create_profile_trigger.sql` - Updated trigger function
2. `supabase/migrations/20231225000004_create_profiles_rls_policies.sql` - Removed blocking INSERT policy
3. `supabase/migrations/20231225000007_hotfix_profile_insert_policy.sql` - New hotfix migration

## Need Help?

If signup still fails after applying this fix:

1. Check Supabase logs: Dashboard → Logs → Database
2. Look for any error messages when a new user signs up
3. Verify the trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
4. Verify the function exists:
   ```sql
   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'handle_new_user';
   -- prosecdef should be 't' (true) for SECURITY DEFINER
   ```

