# Supabase Backend - Hybrid Auth/Approval System

This directory contains all backend infrastructure for the NurseNote application's authentication and authorization system.

## 🎯 What This Provides

- **User Profiles** with role (admin/nurse) and approval status (pending/approved/rejected)
- **Automatic Profile Creation** on user signup via database trigger
- **Row Level Security (RLS)** on all tables to enforce access control
- **Admin Edge Functions** for user management using service role
- **Pending Approval Flow** - new users must be approved before accessing data

## 📁 Directory Structure

```
supabase/
├── migrations/              # Database schema migrations (SQL)
│   ├── 20231225000001_create_profiles_table.sql
│   ├── 20231225000002_create_profile_trigger.sql
│   ├── 20231225000003_create_helper_functions.sql
│   ├── 20231225000004_create_profiles_rls_policies.sql
│   ├── 20231225000005_update_soap_records_rls.sql
│   └── 20231225000006_backfill_existing_users.sql
│
├── functions/               # Supabase Edge Functions (Deno/TypeScript)
│   ├── _shared/            # Shared utilities
│   │   ├── cors.ts         # CORS headers
│   │   ├── supabase.ts     # Supabase client creation
│   │   └── auth.ts         # Auth validation helpers
│   │
│   ├── admin-approve-user/ # Approve/reject users
│   │   └── index.ts
│   │
│   ├── admin-list-users/   # List all users with filters
│   │   └── index.ts
│   │
│   └── admin-list-pending/ # List pending approval users
│       └── index.ts
│
├── DEPLOYMENT_GUIDE.md      # Complete deployment documentation
├── QUICK_REFERENCE.md       # Quick commands and examples
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login and Link Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Deploy Database Migrations

```bash
supabase db push
```

### 4. Set Edge Function Secrets

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending
```

### 6. Create First Admin User

Run in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin', status = 'approved' 
WHERE email = 'your-admin@example.com';
```

## 📊 Database Schema

### profiles Table

| Column     | Type   | Description                          |
|------------|--------|--------------------------------------|
| id         | UUID   | Primary key (references auth.users)  |
| email      | TEXT   | User email (unique)                  |
| role       | TEXT   | 'admin' or 'nurse'                   |
| status     | TEXT   | 'pending', 'approved', 'rejected'    |
| name       | TEXT   | Full name (nullable)                 |
| birthday   | DATE   | Birthday (nullable)                  |
| gender     | TEXT   | Gender (nullable)                    |
| address    | TEXT   | Address (nullable)                   |
| created_at | TIMESTAMP | Creation time                     |
| updated_at | TIMESTAMP | Last update time                  |

### Helper Functions

- `is_admin(uid UUID)` - Returns true if user is approved admin
- `is_approved(uid UUID)` - Returns true if user is approved
- `get_user_role(uid UUID)` - Returns user's role
- `get_user_status(uid UUID)` - Returns user's status

## 🔒 Security Model

### Row Level Security (RLS)

All tables have RLS enabled. Access is controlled by:

1. **Approval Status** - Users must have `status = 'approved'` to access protected data
2. **Role-Based Access** - Admins have broader access than nurses
3. **Ownership** - Nurses can only access their own records

### Edge Functions

Edge Functions use the **service role key** to bypass RLS when performing admin operations. They validate that the requesting user is an admin before executing.

⚠️ **NEVER expose the service role key to the frontend!**

## 🛠️ Edge Functions API

### POST /admin-approve-user

Approve or reject a user.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Body:**
```json
{
  "user_id": "uuid",
  "status": "approved" | "rejected",
  "role": "nurse" | "admin" (optional)
}
```

### GET /admin-list-users

List all users with optional filters.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)
- `role` - Filter by role
- `status` - Filter by status

### GET /admin-list-pending

List users with pending status.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

## 🔄 User Flow

1. **User signs up** → Profile created with `role='nurse'`, `status='pending'`
2. **Pending user** → Cannot access protected data (soap_records, etc.)
3. **Admin approves** → Status changes to `'approved'`
4. **Approved user** → Can now access protected resources

## 📖 Documentation

- **Full Deployment Guide**: See `DEPLOYMENT_GUIDE.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`

## 🧪 Testing Locally

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Run Edge Functions locally
supabase functions serve

# Test a specific function
curl -X POST 'http://localhost:54321/functions/v1/admin-approve-user' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "uuid", "status": "approved"}'
```

## 🐛 Troubleshooting

### Edge Function returns "Missing Supabase environment variables"

Set the secrets:
```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Profile not created on signup

Check if trigger is enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### User can't access data after approval

Verify RLS policies:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Check user status:
```sql
SELECT status FROM profiles WHERE email = 'user@example.com';
```

## 🔧 Maintenance

### Update Edge Functions

```bash
# Make changes to function code
# Redeploy
supabase functions deploy function-name
```

### Add New Protected Table

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add approval policy
CREATE POLICY "Approved users only"
  ON new_table FOR ALL
  USING (public.is_approved(auth.uid()));
```

## 📦 Dependencies

- **Supabase CLI** - For deployment
- **Deno** - Runtime for Edge Functions (managed by Supabase)
- **@supabase/supabase-js** - JavaScript client library

## 🤝 Contributing

When making changes:

1. Test migrations locally first with `supabase db reset`
2. Test Edge Functions locally with `supabase functions serve`
3. Update documentation if adding new features
4. Never commit secrets or API keys

## 📝 License

See main project LICENSE file.

---

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

