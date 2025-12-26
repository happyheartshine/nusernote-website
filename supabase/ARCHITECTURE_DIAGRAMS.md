# Architecture Diagrams - Hybrid Auth/Approval Backend

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                          │
│                                                                        │
│  ┌─────────────────┐                        ┌──────────────────────┐ │
│  │  Login/Signup   │ ─────────────────────> │  Supabase Auth JS    │ │
│  └─────────────────┘  Direct Auth Calls     └──────────────────────┘ │
│                                                         │              │
│  ┌─────────────────┐                                   │              │
│  │  Protected      │                                   │              │
│  │  Pages          │ ◄─────────────────────────────────┘              │
│  │  (Dashboard)    │     Get User Session                             │
│  └─────────────────┘                                                  │
│          │                                                             │
│          │ Read/Write Data                                            │
│          ▼                                                             │
│  ┌─────────────────┐                        ┌──────────────────────┐ │
│  │  Supabase       │ ─────────────────────> │  Database            │ │
│  │  Client         │    RLS Protected        │  (with RLS)          │ │
│  └─────────────────┘                        └──────────────────────┘ │
│          │                                                             │
│          │ Admin Operations                                           │
│          ▼                                                             │
│  ┌─────────────────┐                                                  │
│  │  Admin Panel    │ ───────┐                                         │
│  └─────────────────┘        │                                         │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │ HTTP POST/GET
                               │ Authorization: Bearer JWT
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                                 │
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Edge Functions (Deno)                       │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │   │
│  │  │ admin-approve-   │  │ admin-list-      │  │ admin-list- │ │   │
│  │  │ user             │  │ users            │  │ pending     │ │   │
│  │  └──────────────────┘  └──────────────────┘  └─────────────┘ │   │
│  │           │                     │                     │        │   │
│  │           │  1. Validate JWT    │                     │        │   │
│  │           │  2. Check is_admin()│                     │        │   │
│  │           │  3. Use Service Role│                     │        │   │
│  │           └─────────────────────┴─────────────────────┘        │   │
│  │                               │                                 │   │
│  └───────────────────────────────┼─────────────────────────────────┘   │
│                                  │ Service Role Client                 │
│                                  │ (Bypasses RLS)                      │
│                                  ▼                                     │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                        PostgreSQL Database                     │   │
│  │                                                                 │   │
│  │  ┌──────────────┐         ┌──────────────┐                    │   │
│  │  │ auth.users   │◄────────│  profiles    │                    │   │
│  │  │ (Supabase)   │  FK     │  (Custom)    │                    │   │
│  │  └──────────────┘         └──────────────┘                    │   │
│  │                                  │                              │   │
│  │                                  │ RLS Policies                │   │
│  │                                  ▼                              │   │
│  │                           ┌──────────────┐                     │   │
│  │                           │ soap_records │                     │   │
│  │                           │ (Protected)  │                     │   │
│  │                           └──────────────┘                     │   │
│  │                                                                 │   │
│  │  Functions:                                                    │   │
│  │  • is_admin(uid) → boolean                                     │   │
│  │  • is_approved(uid) → boolean                                  │   │
│  │  • handle_new_user() → trigger                                 │   │
│  │                                                                 │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## User Signup Flow

```
┌─────────────┐
│  New User   │
│  Signs Up   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Supabase Auth Creates User          │
│  in auth.users table                 │
└──────┬───────────────────────────────┘
       │
       │ TRIGGER: on_auth_user_created
       ▼
┌──────────────────────────────────────┐
│  Auto-create Profile                 │
│  • role = 'nurse'                    │
│  • status = 'pending'                │
│  • email from auth.users             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Redirected to                  │
│  /pending-approval page              │
└──────┬───────────────────────────────┘
       │
       │ User tries to access data
       ▼
┌──────────────────────────────────────┐
│  RLS Policy Checks:                  │
│  is_approved(auth.uid())             │
│  Returns FALSE → NO ACCESS           │
└──────────────────────────────────────┘
```

## Admin Approval Flow

```
┌─────────────┐
│   Admin     │
│  Logs In    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Navigate to Admin Panel             │
│  /admin/approvals                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Call Edge Function:                 │
│  GET /admin-list-pending             │
│  Authorization: Bearer <JWT>         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Edge Function:                      │
│  1. Extract JWT                      │
│  2. Get requester user ID            │
│  3. Validate is_admin(requester_id)  │
│  4. Use service role to query        │
│  5. Return pending users             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Admin Reviews Pending Users         │
│  Clicks "Approve" on User            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Call Edge Function:                 │
│  POST /admin-approve-user            │
│  Body: {                             │
│    user_id: "uuid",                  │
│    status: "approved"                │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Edge Function:                      │
│  1. Validate admin                   │
│  2. Use service role client          │
│  3. UPDATE profiles                  │
│     SET status='approved'            │
│     WHERE id=user_id                 │
│  4. Return updated profile           │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Status Now: 'approved'         │
│  User Can Access Protected Data      │
└──────────────────────────────────────┘
```

## Data Access Flow (Approved User)

```
┌─────────────┐
│  Approved   │
│  User       │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  User Queries soap_records           │
│  supabase.from('soap_records')       │
│  .select('*')                        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Supabase Client Adds JWT            │
│  to Request                          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Database Evaluates RLS Policy:      │
│  is_approved(auth.uid())             │
│  AND auth.uid() = user_id            │
└──────┬───────────────────────────────┘
       │
       ├─ TRUE → Return User's Records
       │
       └─ FALSE → Return Empty (0 rows)
```

## RLS Policy Hierarchy

```
                    ┌─────────────┐
                    │  profiles   │
                    └──────┬──────┘
                           │
                           │ Check Role & Status
                           ▼
              ┌────────────────────────┐
              │   is_admin(uid)        │
              │   Returns TRUE if:     │
              │   • role = 'admin'     │
              │   • status = 'approved'│
              └────────┬───────────────┘
                       │
                       ├─── TRUE ────> Full Access to All Tables
                       │
                       └─── FALSE ──┐
                                     │
                                     ▼
                           ┌─────────────────────┐
                           │  is_approved(uid)   │
                           │  Returns TRUE if:   │
                           │  • status='approved'│
                           └──────┬──────────────┘
                                  │
                                  ├─── TRUE ──> Access Own Records
                                  │
                                  └─── FALSE ─> NO ACCESS
```

## Edge Function Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Function Request                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Extract Authorization Header                       │
│  • Must be present                                           │
│  • Format: "Bearer <JWT>"                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Get User ID from JWT                               │
│  • Create user client with JWT                              │
│  • Call supabase.auth.getUser()                             │
│  • Extract user.id                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Validate Admin Status                              │
│  • Create service role client                               │
│  • Query profiles table:                                     │
│    SELECT role, status FROM profiles WHERE id = user.id     │
│  • Check: role='admin' AND status='approved'                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─── TRUE ──> Proceed with Operation
                              │
                              └─── FALSE ─> Return 403 Forbidden
```

## Database Trigger Flow

```
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO auth.users (New User Signup)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ AFTER INSERT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Trigger: on_auth_user_created                              │
│  Executes: handle_new_user()                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Function: handle_new_user()                                │
│  BEGIN                                                       │
│    INSERT INTO profiles (id, email, role, status)           │
│    VALUES (NEW.id, NEW.email, 'nurse', 'pending');          │
│  EXCEPTION                                                   │
│    WHEN unique_violation THEN                               │
│      -- Profile exists, do nothing                          │
│  END;                                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Profile Created Successfully                               │
│  User has: role='nurse', status='pending'                   │
└─────────────────────────────────────────────────────────────┘
```

## Migration Deployment Order

```
Migration 1: Create profiles table
    ↓
Migration 2: Create profile trigger
    ↓
Migration 3: Create helper functions
    ↓
Migration 4: Create profiles RLS policies
    ↓
Migration 5: Update soap_records RLS
    ↓
Migration 6: Backfill existing users
    ↓
Deploy Edge Functions
    ↓
Create First Admin User (SQL)
```

## Component Dependencies

```
┌──────────────────────┐
│  Edge Functions      │
│  Depend on:          │
│  • Helper functions  │
│  • profiles table    │
│  • Service role key  │
└──────────────────────┘

┌──────────────────────┐
│  RLS Policies        │
│  Depend on:          │
│  • Helper functions  │
│  • profiles table    │
└──────────────────────┘

┌──────────────────────┐
│  Helper Functions    │
│  Depend on:          │
│  • profiles table    │
└──────────────────────┘

┌──────────────────────┐
│  Profile Trigger     │
│  Depends on:         │
│  • profiles table    │
│  • auth.users table  │
└──────────────────────┘
```

## Security Zones

```
┌─────────────────────────────────────────────────────────────┐
│                         PUBLIC ZONE                          │
│  • Frontend JavaScript                                       │
│  • User browsers                                             │
│  • Has: Anon key, User JWT                                   │
│  • Can: Auth, Query with RLS                                 │
│  • Cannot: Bypass RLS, Access service key                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP with JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       PROTECTED ZONE                         │
│  • Edge Functions                                            │
│  • Server-side only                                          │
│  • Has: Service role key                                     │
│  • Can: Bypass RLS, Validate admin, Update roles             │
│  • Cannot: Be called without valid JWT                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Service Role
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE ZONE                         │
│  • PostgreSQL                                                │
│  • RLS Policies Active                                       │
│  • Triggers Active                                           │
│  • Can: Enforce security, Log changes                        │
│  • Bypassed: Only by service role                            │
└─────────────────────────────────────────────────────────────┘
```

