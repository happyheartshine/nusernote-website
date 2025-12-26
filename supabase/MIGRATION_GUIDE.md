# Migration Guide - Hybrid Auth/Approval Backend

## Overview

This document explains the changes made to implement the hybrid authentication and approval system, and what existing code/workflows need to be updated.

## What Changed

### 1. New Database Table: `profiles`

A new `profiles` table was added that extends `auth.users` with:
- `role` - 'admin' or 'nurse'
- `status` - 'pending', 'approved', or 'rejected'
- Additional profile fields (name, birthday, gender, address)

**Impact**: Profiles are automatically created on signup. Existing users were backfilled.

### 2. Updated RLS Policies on `soap_records`

The `soap_records` table now requires:
- Users must have `status = 'approved'` to access ANY data
- Pending users are completely blocked from reading/writing

**Previous behavior**: Any authenticated user could access their own records
**New behavior**: Only approved users can access records

### 3. New Edge Functions

Three new Edge Functions for admin operations:
- `admin-approve-user` - Approve/reject users
- `admin-list-users` - List all users with filters
- `admin-list-pending` - List pending users

**Impact**: Frontend needs to integrate these for admin workflows

### 4. New Helper Functions

SQL functions for use in RLS policies and queries:
- `is_admin(uid)` - Check if user is approved admin
- `is_approved(uid)` - Check if user is approved
- `get_user_role(uid)` - Get user's role
- `get_user_status(uid)` - Get user's status

## Frontend Changes Required

### 1. Update Authentication Flow

After login, check user's approval status:

```typescript
// OLD CODE
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  router.push('/dashboard');
}

// NEW CODE
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  // Check profile status
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single();
  
  if (profile?.status === 'pending') {
    router.push('/pending-approval');
  } else if (profile?.status === 'approved') {
    router.push('/dashboard');
  } else {
    // rejected or no profile
    router.push('/access-denied');
  }
}
```

### 2. Add Pending Approval Page

Create a page for users with pending status:

```tsx
// pages/pending-approval.tsx
export default function PendingApproval() {
  return (
    <div>
      <h1>Account Pending Approval</h1>
      <p>Your account is pending approval by an administrator.</p>
      <p>You will receive access once your account is approved.</p>
    </div>
  );
}
```

### 3. Add Admin Approval Interface

Create an admin page to manage user approvals:

```tsx
// pages/admin/approvals.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function UserApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  
  useEffect(() => {
    fetchPendingUsers();
  }, []);
  
  async function fetchPendingUsers() {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-list-pending`,
      {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      }
    );
    
    const result = await response.json();
    setPendingUsers(result.pending_users || []);
  }
  
  async function approveUser(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-approve-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, status: 'approved' }),
      }
    );
    
    fetchPendingUsers(); // Refresh list
  }
  
  return (
    <div>
      <h1>Pending User Approvals</h1>
      {pendingUsers.map(user => (
        <div key={user.id}>
          <span>{user.email}</span>
          <button onClick={() => approveUser(user.id)}>Approve</button>
          <button onClick={() => rejectUser(user.id)}>Reject</button>
        </div>
      ))}
    </div>
  );
}
```

### 4. Update Route Guards

If you have route protection logic, update it:

```typescript
// OLD CODE
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return redirect('/login');
}

// NEW CODE
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return redirect('/login');
}

const { data: profile } = await supabase
  .from('profiles')
  .select('status')
  .eq('id', user.id)
  .single();

if (profile?.status !== 'approved') {
  return redirect('/pending-approval');
}
```

### 5. Admin Guard for Admin Pages

```typescript
// components/AdminGuard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

export function AdminGuard({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    checkAdminStatus();
  }, []);
  
  async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    
    if (profile?.role === 'admin' && profile?.status === 'approved') {
      setIsAdmin(true);
    } else {
      router.push('/unauthorized');
    }
    
    setLoading(false);
  }
  
  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return null;
  
  return <>{children}</>;
}
```

## Backend Changes Required

### If Using Python Backend

The Python backend should continue to work without changes, BUT:

1. **Service saves will still work** - The backend uses service role key which bypasses RLS
2. **User verification should check approval** - Update JWT verification to also check profile status:

```python
# backend/api/dependencies.py

async def verify_approved_user(authorization: str = Header(None)):
    """Verify user is authenticated AND approved"""
    user_id = verify_jwt_token(authorization)
    
    # Check profile status
    response = supabase_client.table('profiles') \
        .select('status') \
        .eq('id', user_id) \
        .single() \
        .execute()
    
    if not response.data or response.data['status'] != 'approved':
        raise HTTPException(status_code=403, detail="User not approved")
    
    return user_id
```

3. **Update endpoints to use new dependency**:

```python
# OLD
@router.post("/generate")
async def generate_note(user_id: str = Depends(verify_jwt_token)):
    ...

# NEW
@router.post("/generate")
async def generate_note(user_id: str = Depends(verify_approved_user)):
    ...
```

## Testing the Migration

### Step 1: Verify Existing Users Have Profiles

```sql
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM profiles;
-- These should match
```

### Step 2: Test New User Signup

1. Sign up a new user
2. Check they get pending status:
   ```sql
   SELECT * FROM profiles WHERE email = 'newuser@example.com';
   ```
3. Verify they cannot access soap_records
4. Approve them via Edge Function
5. Verify they can now access data

### Step 3: Test Admin Functions

1. Create an admin user:
   ```sql
   UPDATE profiles SET role='admin', status='approved' WHERE email='admin@example.com';
   ```
2. Login as admin
3. Test calling admin-list-pending
4. Test approving a user
5. Verify approval worked

### Step 4: Test RLS Policies

```sql
-- As a pending user (should return 0 rows)
SET request.jwt.claim.sub = 'pending-user-uuid';
SELECT * FROM soap_records;

-- As an approved user (should return their records)
SET request.jwt.claim.sub = 'approved-user-uuid';
SELECT * FROM soap_records;
```

## Rollback Plan

If you need to rollback:

### Option 1: Disable Approval Requirement (Keep System)

```sql
-- Remove approval requirement from soap_records
DROP POLICY "Approved nurses can view their own records" ON soap_records;
DROP POLICY "Approved users can insert their own records" ON soap_records;

-- Restore old policies
CREATE POLICY "Users can view their own records"
  ON soap_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
  ON soap_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- etc.
```

### Option 2: Full Rollback (Remove Everything)

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_approved(UUID);

-- Drop policies (profiles will be inaccessible but data is safe)
-- Drop table
DROP TABLE IF EXISTS profiles CASCADE;

-- Restore original soap_records policies
-- (Run original schema SQL)
```

## Common Issues and Solutions

### Issue: Existing users can't access data

**Solution**: They need to be approved
```sql
UPDATE profiles SET status = 'approved' WHERE status = 'pending';
```

### Issue: Admin can't access admin functions

**Solution**: Verify they're marked as admin
```sql
UPDATE profiles SET role = 'admin', status = 'approved' WHERE email = 'admin@example.com';
```

### Issue: Profile not created on signup

**Solution**: Check trigger is enabled
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

If missing, run migration 20231225000002 again.

## Timeline Recommendation

1. **Week 1**: Deploy to staging, test thoroughly
2. **Week 2**: Create first admin users, test admin workflows
3. **Week 3**: Deploy to production, auto-approve existing users
4. **Week 4+**: Start using approval workflow for new users

## Support

If you encounter issues during migration:

1. Check Supabase Dashboard → Logs
2. Verify all migrations ran successfully
3. Check RLS policies in Database → Policies
4. Review user profiles in Table Editor
5. Test Edge Functions in Functions → Logs

---

**Questions?** See DEPLOYMENT_GUIDE.md or QUICK_REFERENCE.md for more details.

