# 🚀 Hybrid Auth Frontend - Quick Start Guide

## What Was Implemented

This implementation adds a complete role-based authentication system to your Next.js application with:

- ✅ Email/Password + OAuth (Google & Microsoft) login
- ✅ User approval workflow (pending → approved/rejected)
- ✅ Role-based access (admin vs nurse)
- ✅ Admin pages for user management
- ✅ Protected routes and navigation
- ✅ Japanese UI throughout

## Files Created

### Core Infrastructure
```
src/types/auth.ts                       # TypeScript types
src/hooks/useAuthProfile.js             # Profile data hook
src/lib/errorHandler.js                 # Error handling utilities
```

### Route Guards
```
src/components/auth/AuthGuard.jsx       # Auth + approval check
src/components/auth/AdminGuard.jsx      # Admin role check
src/components/auth/RLSErrorBoundary.jsx # RLS error handler
```

### Pages
```
src/app/(auth)/pending-approval/page.jsx        # Waiting page for pending users
src/app/(auth)/auth/callback/page.jsx           # OAuth callback handler
src/app/(dashboard)/admin/approvals/page.jsx    # Approve/reject pending users
src/app/(dashboard)/admin/users/page.jsx        # Manage all users
```

### Menu & Navigation
```
src/menu-items/admin.jsx                # Admin menu items
```

### Files Modified
```
src/views/pages/Login.jsx               # Added profile-based routing
src/contexts/AuthContext.jsx            # Updated OAuth callback URL
src/app/(dashboard)/layout.jsx          # Changed to AuthGuard
src/menu-items/index.jsx                # Added admin menu
src/layout/Dashboard/Header/HeaderContent/UserProfile.jsx  # Show profile data
src/layout/Dashboard/Drawer/DrawerContent/Navigation/index.jsx  # Filter by role
```

### Documentation
```
HYBRID_AUTH_FRONTEND.md                 # Complete documentation
IMPLEMENTATION_SUMMARY.md               # This file
```

## How It Works

### For New Users
1. User registers → profile created with `status='pending'`
2. User tries to log in → redirected to `/pending-approval`
3. User waits for admin approval
4. Cannot access any app features while pending

### For Admin Users
1. Admin logs in → redirected to `/admin/approvals`
2. Sees list of pending users
3. Clicks "承認" (Approve) or "却下" (Reject)
4. User status updated via Edge Function
5. User can now access app (if approved)

### For Approved Nurses
1. Nurse logs in → redirected to `/dashboard/default`
2. Can access dashboard and features
3. Cannot see or access admin pages
4. Admin menu items hidden from navigation

### For Approved Admins
1. Admin logs in → redirected to `/admin/approvals`
2. Can access all dashboard features
3. Can access admin pages
4. Admin menu items visible in navigation
5. Can manage users, approve/reject, change roles

## Key Components

### `useAuthProfile()` Hook
```javascript
import { useAuthProfile } from '@/hooks/useAuthProfile';

function MyComponent() {
  const { profile, loading, error } = useAuthProfile();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Name: {profile?.name}</p>
      <p>Role: {profile?.role}</p>
      <p>Status: {profile?.status}</p>
    </div>
  );
}
```

### `AuthGuard` Component
Protects routes - requires authentication + approved status:
```javascript
import AuthGuard from '@/components/auth/AuthGuard';

export default function MyPage() {
  return (
    <AuthGuard>
      <div>Only approved users can see this</div>
    </AuthGuard>
  );
}
```

### `AdminGuard` Component
Protects admin routes - requires admin role + approved status:
```javascript
import AdminGuard from '@/components/auth/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div>Only admins can see this</div>
    </AdminGuard>
  );
}
```

## Routes

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Approved Users Only)
- `/dashboard/default` - Main dashboard
- `/dashboard/*` - Other dashboard pages

### Admin Routes (Admin Role Only)
- `/admin/approvals` - Approve/reject pending users
- `/admin/users` - Manage all users

### Special Routes
- `/pending-approval` - Shown to pending users
- `/auth/callback` - OAuth redirect handler

## Backend Requirements

For this frontend to work, you need:

### 1. Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'nurse')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  name TEXT,
  birthday DATE,
  gender TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Edge Function: `admin-approve-user`
```javascript
// Endpoint: /functions/v1/admin-approve-user
// Body: { userId: "uuid", status: "approved" | "rejected" }
// Must validate that caller is admin before updating
```

### 3. RLS Policies

**On `profiles` table:**
```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'approved'
    )
  );
```

**On other tables (e.g., `soap_records`):**
```sql
-- Only approved users can access data
CREATE POLICY "Approved users can access"
  ON public.soap_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND status = 'approved'
    )
  );
```

### 4. OAuth Providers
Configure in Supabase Dashboard:
- Google OAuth
- Microsoft (Azure) OAuth
- Callback URL: `https://your-domain.com/auth/callback`

## Testing the Implementation

### 1. Test Pending User Flow
```bash
# Create a new user account
# Log in with that account
# Expected: Redirected to /pending-approval
# Try navigating to /dashboard/default
# Expected: Redirected back to /pending-approval
```

### 2. Test Admin Approval
```bash
# Log in as admin (you'll need to manually set a user to admin in DB)
# Navigate to /admin/approvals
# Expected: See pending users
# Click 承認 (Approve) button
# Expected: User approved and removed from list
# Log out and log in as that user
# Expected: Can now access dashboard
```

### 3. Test Role-Based Access
```bash
# Log in as approved nurse
# Check sidebar menu
# Expected: No admin menu items
# Try navigating to /admin/users
# Expected: Redirected to /dashboard/default

# Log in as admin
# Check sidebar menu
# Expected: Admin menu items visible
# Navigate to /admin/users
# Expected: Can see page and all users
```

### 4. Test OAuth
```bash
# Click "Googleで続行" button
# Complete Google OAuth flow
# Expected: Redirected back and profile checked
# If pending → /pending-approval
# If approved → /dashboard/default or /admin/approvals
```

## Creating Your First Admin User

Since new users start as `pending`, you need to manually create the first admin:

```sql
-- Find your user ID from auth.users
SELECT id, email FROM auth.users;

-- Update the profile to admin with approved status
UPDATE public.profiles
SET role = 'admin', status = 'approved'
WHERE id = '<your-user-id>';
```

Or use the Supabase SQL editor to update the first user's profile.

## Troubleshooting

### Users Can't Access Anything After Approval
- Check: Profile status is `approved` in database
- Check: RLS policies allow approved users to read data
- Try: Log out and log back in to refresh session

### Admin Menu Items Don't Show
- Check: User role is `admin` in database
- Check: User status is `approved`
- Check: `useAuthProfile()` is loading profile correctly
- Try: Hard refresh the page

### OAuth Redirect Fails
- Check: OAuth callback URL is correct in Supabase
- Check: OAuth providers are enabled
- Check: Correct provider name ('google' or 'azure')
- Check: `/auth/callback` page exists

### Edge Function Fails
- Check: Edge Function is deployed
- Check: Function validates admin role
- Check: Request body format is correct
- Check: Database policies allow function to update

### Pending User Sees Dashboard
- Check: `AuthGuard` is wrapping dashboard layout
- Check: Profile status is actually `pending`
- Check: No caching issues (hard refresh)

## Next Steps

1. **Deploy Backend**:
   - Create profiles table
   - Deploy Edge Function
   - Set up RLS policies
   - Configure OAuth providers

2. **Test Locally**:
   - Create test accounts
   - Test all user flows
   - Verify guards work
   - Check menu filtering

3. **Create First Admin**:
   - Register account
   - Manually promote to admin in DB
   - Test approval workflow

4. **Deploy Frontend**:
   - Build and deploy Next.js app
   - Verify environment variables
   - Test in production

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for Edge Function errors
3. Verify RLS policies with SQL
4. Review `HYBRID_AUTH_FRONTEND.md` for detailed docs
5. Check that all files from "Files Created" section exist

## Summary

You now have a complete hybrid auth system with:
- 🔐 Multiple authentication methods
- 👥 User approval workflow
- 🛡️ Role-based access control
- 📊 Admin user management
- 🎨 Clean Japanese UI
- 🚦 Route protection

All frontend components are complete and ready to use once you set up the backend!

