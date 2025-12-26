# Hybrid Auth/Approval Backend - Deployment Guide

## Overview

This guide covers the setup and deployment of the hybrid authentication and approval system for the NurseNote application. The system implements:

- **Supabase Auth** for authentication (frontend)
- **Row Level Security (RLS)** for database access control
- **Role-based access control** (Admin/Nurse roles)
- **Approval workflow** (Pending/Approved/Rejected status)
- **Edge Functions** for admin operations using service role

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  • Uses Supabase Auth directly (supabase.auth.*)           │
│  • Calls Edge Functions for admin operations                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│                                                              │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │  Auth System   │      │  Edge Functions  │              │
│  │  (auth.users)  │      │  (service role)  │              │
│  └────────────────┘      └──────────────────┘              │
│           │                       │                          │
│           ▼                       ▼                          │
│  ┌─────────────────────────────────────────────┐           │
│  │         Database with RLS Enabled            │           │
│  │  • profiles (role, status)                   │           │
│  │  • soap_records (requires approval)          │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Account** and project created
2. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```
3. **Supabase Project URL and Keys**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` (for frontend)
   - `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions - keep secure!)

## Deployment Steps

### Step 1: Database Migrations

The migrations are located in `supabase/migrations/` and must be run in order:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

#### Option B: Manual SQL Execution

Run each migration file in the Supabase SQL Editor in order:

1. `20231225000001_create_profiles_table.sql` - Creates profiles table
2. `20231225000002_create_profile_trigger.sql` - Auto-creates profiles on signup
3. `20231225000003_create_helper_functions.sql` - Creates is_admin() and is_approved()
4. `20231225000004_create_profiles_rls_policies.sql` - RLS policies for profiles
5. `20231225000005_update_soap_records_rls.sql` - Updates soap_records RLS
6. `20231225000006_backfill_existing_users.sql` - Backfills existing users

**To run manually:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file
3. Execute in order

### Step 2: Create First Admin User

After running migrations, create your first admin user:

```sql
-- Run in Supabase SQL Editor
-- Replace with your actual admin email
UPDATE public.profiles
SET role = 'admin', status = 'approved'
WHERE email = 'your-admin@example.com';
```

⚠️ **Important**: Do this immediately after deployment so you can approve other users!

### Step 3: Deploy Edge Functions

Deploy the Edge Functions using Supabase CLI:

```bash
# Deploy all functions at once
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending
```

Or deploy individually:

```bash
# Navigate to supabase directory
cd supabase

# Deploy admin-approve-user
supabase functions deploy admin-approve-user --no-verify-jwt

# Deploy admin-list-users
supabase functions deploy admin-list-users --no-verify-jwt

# Deploy admin-list-pending
supabase functions deploy admin-list-pending --no-verify-jwt
```

### Step 4: Configure Environment Variables

#### Frontend Environment Variables

Create or update `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Edge Functions Environment Variables

Set secrets for Edge Functions (these are NOT exposed to frontend):

```bash
# Set the Supabase URL
supabase secrets set SUPABASE_URL=https://your-project.supabase.co

# Set the service role key (NEVER expose this!)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Set the anon key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these keys:**
1. Go to Supabase Dashboard
2. Navigate to Settings → API
3. Copy the values

⚠️ **SECURITY WARNING**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses ALL RLS policies. NEVER expose it to the frontend or client-side code!

### Step 5: Verify Deployment

Test each component:

#### Test 1: Profile Creation

```bash
# Sign up a new user via your frontend
# Check Supabase Dashboard → Table Editor → profiles
# Should see new profile with role='nurse', status='pending'
```

#### Test 2: Edge Function - Approve User

```bash
# Get your admin JWT token (from frontend after login)
curl -X POST 'https://your-project.supabase.co/functions/v1/admin-approve-user' \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-to-approve",
    "status": "approved"
  }'
```

#### Test 3: Edge Function - List Users

```bash
curl 'https://your-project.supabase.co/functions/v1/admin-list-users' \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

#### Test 4: Edge Function - List Pending

```bash
curl 'https://your-project.supabase.co/functions/v1/admin-list-pending' \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## API Reference

### Edge Function: admin-approve-user

**Endpoint:** `POST /functions/v1/admin-approve-user`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "user_id": "uuid",
  "status": "approved" | "rejected",
  "role": "nurse" | "admin" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "User approved successfully",
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "nurse",
    "status": "approved",
    "name": "John Doe",
    "created_at": "2023-12-25T00:00:00Z",
    "updated_at": "2023-12-25T00:00:00Z"
  }
}
```

### Edge Function: admin-list-users

**Endpoint:** `GET /functions/v1/admin-list-users`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `limit` (optional, default: 100) - Number of results per page
- `offset` (optional, default: 0) - Pagination offset
- `role` (optional) - Filter by role: 'admin' or 'nurse'
- `status` (optional) - Filter by status: 'pending', 'approved', or 'rejected'

**Example:**
```
GET /functions/v1/admin-list-users?limit=20&offset=0&status=approved
```

**Response:**
```json
{
  "success": true,
  "profiles": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "nurse",
      "status": "approved",
      "name": "John Doe",
      "birthday": "1990-01-01",
      "gender": "male",
      "address": "123 Main St",
      "created_at": "2023-12-25T00:00:00Z",
      "updated_at": "2023-12-25T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "returned": 20
  }
}
```

### Edge Function: admin-list-pending

**Endpoint:** `GET /functions/v1/admin-list-pending`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `limit` (optional, default: 100) - Number of results per page
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "pending_users": [
    {
      "id": "uuid",
      "email": "pending@example.com",
      "role": "nurse",
      "status": "pending",
      "name": "Jane Smith",
      "created_at": "2023-12-25T00:00:00Z",
      "updated_at": "2023-12-25T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0,
    "returned": 5
  }
}
```

## Data Model

### profiles Table

| Column      | Type        | Description                                    |
|-------------|-------------|------------------------------------------------|
| id          | UUID        | Primary key, references auth.users(id)         |
| email       | TEXT        | User email (unique)                            |
| role        | TEXT        | 'admin' or 'nurse' (default: 'nurse')          |
| status      | TEXT        | 'pending', 'approved', or 'rejected'           |
| name        | TEXT        | User's full name (nullable)                    |
| birthday    | DATE        | User's birthday (nullable)                     |
| gender      | TEXT        | User's gender (nullable)                       |
| address     | TEXT        | User's address (nullable)                      |
| created_at  | TIMESTAMPTZ | Profile creation timestamp                     |
| updated_at  | TIMESTAMPTZ | Last update timestamp (auto-updated)           |

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

#### profiles Table

1. **Users can view their own profile** - Any authenticated user can read their own profile
2. **Admins can view all profiles** - Approved admins can read all profiles
3. **Users can update own fields** - Users can update name, birthday, gender, address (NOT role/status)
4. **Admins can update role/status** - Only admins can change role and status
5. **Prevent direct inserts** - Profiles only created via trigger
6. **Prevent direct deletes** - Profiles cascade delete with auth.users

#### soap_records Table

1. **Approved nurses can view own records** - Nurses with approved status can read their records
2. **Approved admins can view all records** - Approved admins can read all records
3. **Approved users can insert own records** - Only approved users can create records
4. **Approved nurses can update own records** - Nurses can update their own records
5. **Approved admins can update all records** - Admins can update any record
6. **Approved nurses can delete own records** - Nurses can delete their own records
7. **Approved admins can delete all records** - Admins can delete any record

### Helper Functions

- `public.is_admin(uid UUID)` - Returns true if user is admin with approved status
- `public.is_approved(uid UUID)` - Returns true if user has approved status
- `public.get_user_role(uid UUID)` - Returns user's role
- `public.get_user_status(uid UUID)` - Returns user's status

## Workflow

### New User Signup Flow

```
1. User signs up via Supabase Auth
   ↓
2. Trigger automatically creates profile:
   - role = 'nurse'
   - status = 'pending'
   ↓
3. User is redirected to "Pending Approval" page
   ↓
4. User CANNOT access soap_records or other protected data
   ↓
5. Admin logs in and calls admin-list-pending
   ↓
6. Admin approves user via admin-approve-user
   ↓
7. User's status changes to 'approved'
   ↓
8. User can now access protected resources
```

### Admin User Creation Flow

```
1. Admin signs up normally (gets nurse role + pending status)
   ↓
2. Existing admin manually updates their profile in SQL:
   UPDATE profiles SET role='admin', status='approved' WHERE email='new-admin@example.com'
   ↓
3. New admin can now access admin functions
```

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:** Ensure Edge Functions have secrets set:
```bash
supabase secrets list
supabase secrets set SUPABASE_URL=https://...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Issue: "Unauthorized" when calling Edge Functions

**Possible causes:**
1. Not logged in - Ensure Authorization header has valid JWT
2. Not an admin - Check user's role and status in profiles table
3. Token expired - Refresh the token

**Debug:**
```sql
-- Check user's role and status
SELECT id, email, role, status FROM profiles WHERE email = 'your-email@example.com';
```

### Issue: User can't access soap_records after approval

**Solution:** Check RLS policies are applied:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check user status
SELECT status FROM profiles WHERE id = auth.uid();
```

### Issue: Profile not created on signup

**Solution:** Check trigger exists and is enabled:
```sql
-- Check trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create profile if needed
INSERT INTO profiles (id, email, role, status)
VALUES ('user-uuid', 'user@example.com', 'nurse', 'pending');
```

## Best Practices

1. **Never expose service role key** - Only use in Edge Functions, never in frontend
2. **Always verify admin status** - Use `validateAdmin()` in Edge Functions
3. **Use helper functions in RLS** - Leverage `is_admin()` and `is_approved()` for consistency
4. **Monitor pending users** - Regularly check and approve/reject pending users
5. **Audit admin actions** - Consider adding audit logging for approval actions
6. **Backup before migrations** - Always backup database before running migrations

## Maintenance

### Adding a New Protected Table

When adding a new table that should be restricted to approved users:

```sql
-- Enable RLS
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;

-- Add approval requirement policy
CREATE POLICY "Approved users only"
  ON your_new_table
  FOR ALL
  USING (public.is_approved(auth.uid()));

-- Add admin override policy
CREATE POLICY "Admins can access all"
  ON your_new_table
  FOR ALL
  USING (public.is_admin(auth.uid()));
```

### Updating Edge Functions

```bash
# Make changes to function code
# Then redeploy
supabase functions deploy function-name
```

## Support

For issues or questions:
1. Check Supabase Dashboard → Logs for Edge Function errors
2. Check Supabase Dashboard → Table Editor to verify data
3. Review RLS policies in Database → Policies
4. Check this documentation for common issues

## Summary

You now have a complete hybrid auth/approval backend with:

✅ Profile management with roles and status
✅ Automatic profile creation on signup
✅ RLS policies protecting all data
✅ Admin Edge Functions for user management
✅ Secure service role usage
✅ Comprehensive documentation

All users start as pending nurses and must be approved by an admin before accessing protected resources.

