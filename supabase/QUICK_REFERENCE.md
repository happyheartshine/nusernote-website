# Hybrid Auth/Approval Backend - Quick Reference

## Quick Commands

### Deploy Everything

```bash
# 1. Push database migrations
supabase db push

# 2. Set Edge Function secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key

# 3. Deploy Edge Functions
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending

# 4. Create first admin (run in SQL Editor)
# UPDATE profiles SET role='admin', status='approved' WHERE email='your-email@example.com';
```

### Local Development

```bash
# Start Supabase locally
supabase start

# Apply migrations locally
supabase db reset

# Test Edge Functions locally
supabase functions serve

# Run specific function locally
supabase functions serve admin-approve-user --no-verify-jwt
```

## File Structure

```
supabase/
├── migrations/
│   ├── 20231225000001_create_profiles_table.sql
│   ├── 20231225000002_create_profile_trigger.sql
│   ├── 20231225000003_create_helper_functions.sql
│   ├── 20231225000004_create_profiles_rls_policies.sql
│   ├── 20231225000005_update_soap_records_rls.sql
│   └── 20231225000006_backfill_existing_users.sql
├── functions/
│   ├── _shared/
│   │   ├── cors.ts
│   │   ├── supabase.ts
│   │   └── auth.ts
│   ├── admin-approve-user/
│   │   └── index.ts
│   ├── admin-list-users/
│   │   └── index.ts
│   └── admin-list-pending/
│       └── index.ts
└── DEPLOYMENT_GUIDE.md
```

## Edge Function Endpoints

### Approve/Reject User

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/admin-approve-user' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "status": "approved"}'
```

### List All Users

```bash
curl 'https://YOUR_PROJECT.supabase.co/functions/v1/admin-list-users?limit=50&offset=0' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Pending Users

```bash
curl 'https://YOUR_PROJECT.supabase.co/functions/v1/admin-list-pending' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common SQL Queries

### Check User Status

```sql
SELECT id, email, role, status FROM profiles WHERE email = 'user@example.com';
```

### Approve User Manually

```sql
UPDATE profiles SET status = 'approved' WHERE email = 'user@example.com';
```

### Create Admin User

```sql
UPDATE profiles SET role = 'admin', status = 'approved' WHERE email = 'admin@example.com';
```

### List All Pending Users

```sql
SELECT id, email, name, created_at FROM profiles WHERE status = 'pending' ORDER BY created_at ASC;
```

### Count Users by Status

```sql
SELECT status, COUNT(*) FROM profiles GROUP BY status;
```

### Check RLS Policies

```sql
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public';
```

## Frontend Integration Examples

### JavaScript/TypeScript

```typescript
import { supabase } from './lib/supabase';

// Approve a user (admin only)
async function approveUser(userId: string, status: 'approved' | 'rejected') {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-approve-user`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, status }),
    }
  );
  
  return response.json();
}

// List pending users (admin only)
async function listPendingUsers() {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-list-pending`,
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    }
  );
  
  return response.json();
}

// Check current user's profile
async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return data;
}
```

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Edge Functions (Supabase Secrets)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key not exposed to frontend
- [ ] Admin validation in all admin Edge Functions
- [ ] CORS headers configured properly
- [ ] First admin user created
- [ ] Pending users cannot access protected tables
- [ ] Users cannot modify their own role/status

## Troubleshooting Quick Fixes

### Edge Function returns 401

```sql
-- Check if user is admin
SELECT role, status FROM profiles WHERE id = 'user-uuid';
```

### User can't access data after approval

```sql
-- Force refresh status
UPDATE profiles SET updated_at = NOW() WHERE id = 'user-uuid';

-- Check RLS policies are enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'soap_records';
```

### Profile not created on signup

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create missing profiles
INSERT INTO profiles (id, email, role, status)
SELECT id, email, 'nurse', 'pending'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
```

## Additional Resources

- Full documentation: `supabase/DEPLOYMENT_GUIDE.md`
- Supabase Docs: https://supabase.com/docs
- Edge Functions: https://supabase.com/docs/guides/functions
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

