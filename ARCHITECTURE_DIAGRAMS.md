# Hybrid Auth System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐              │
│  │   Login    │  │   OAuth    │  │   Register   │              │
│  │   Page     │  │  Callback  │  │     Page     │              │
│  └──────┬─────┘  └─────┬──────┘  └──────┬───────┘              │
│         │              │                 │                       │
│         └──────────────┴─────────────────┘                       │
│                        │                                         │
│                        ▼                                         │
│              ┌──────────────────┐                                │
│              │  useAuthProfile  │◄────┐                          │
│              │      Hook        │     │                          │
│              └────────┬─────────┘     │                          │
│                       │               │                          │
│         ┌─────────────┴────────┐      │                          │
│         │                      │      │                          │
│         ▼                      ▼      │                          │
│  ┌────────────┐         ┌────────────┐│                          │
│  │ AuthGuard  │         │AdminGuard  ││                          │
│  │(Approved)  │         │  (Admin)   ││                          │
│  └─────┬──────┘         └─────┬──────┘│                          │
│        │                      │       │                          │
│        ▼                      ▼       │                          │
│  ┌──────────────┐      ┌──────────────┐                          │
│  │  Dashboard   │      │Admin Pages   │                          │
│  │   Pages      │      │- Approvals   │                          │
│  │              │      │- Users       │                          │
│  └──────────────┘      └──────────────┘                          │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            │ Supabase Client
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                      Supabase Backend                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │  Auth Users  │   │  Profiles    │   │ Edge Function│         │
│  │  (Supabase)  │   │   Table      │   │admin-approve │         │
│  │              │   │  (Postgres)  │   │    -user     │         │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘         │
│         │                  │                   │                 │
│         └──────────────────┴───────────────────┘                 │
│                            │                                     │
│                            ▼                                     │
│                    ┌───────────────┐                             │
│                    │  RLS Policies │                             │
│                    │  (Row Level   │                             │
│                    │   Security)   │                             │
│                    └───────────────┘                             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## User State Machine

```
┌──────────────┐
│  New User    │
│  Registers   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Profile Created │
│ status: pending  │
│ role: nurse      │
└──────┬───────────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
┌──────────────┐              ┌──────────────┐
│    Admin     │              │   User Logs  │
│  Approves    │              │   In → See   │
│              │              │  /pending-   │
│              │              │  approval    │
└──────┬───────┘              └──────────────┘
       │
       ▼
┌──────────────────┐
│status: approved  │
│ Access Granted   │
└──────┬───────────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│role: admin   │   │role: nurse   │  │   Admin      │
│              │   │              │  │  Rejects     │
│Can Access:   │   │Can Access:   │  │              │
│- Dashboard   │   │- Dashboard   │  └──────┬───────┘
│- Admin Pages │   │Only          │         │
│- All Data    │   │- Own Data    │         ▼
└──────────────┘   └──────────────┘  ┌──────────────┐
                                     │status:rejected│
                                     │              │
                                     │Cannot Login  │
                                     └──────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Initiates Login                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐        ┌──────▼───────┐
        │ Email/Password │        │    OAuth     │
        │     Login      │        │ Google/MS    │
        └───────┬────────┘        └──────┬───────┘
                │                        │
                └────────────┬───────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Supabase Auth  │
                    │   Validates    │
                    └────────┬───────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
            ┌─────▼─────┐         ┌────▼─────┐
            │  Success  │         │   Error  │
            └─────┬─────┘         └────┬─────┘
                  │                    │
                  │                    ▼
                  │            ┌───────────────┐
                  │            │ Show Error    │
                  │            │ Stay on Login │
                  │            └───────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ Fetch Profile    │
        │ from profiles    │
        │ table            │
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │ Check Profile    │
        │    Status        │
        └──────┬───────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Pending │ │Rejected │ │Approved │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     │           │           └────────────┐
     │           │                        │
     ▼           ▼                  ┌─────┴─────┐
┌─────────┐ ┌─────────┐            │           │
│Redirect │ │Sign Out │        ┌───▼───┐   ┌───▼───┐
│   to    │ │  Show   │        │ Admin │   │ Nurse │
│/pending │ │ Error   │        └───┬───┘   └───┬───┘
│approval │ │ Message │            │           │
└─────────┘ └─────────┘            │           │
                                   ▼           ▼
                            ┌─────────┐ ┌─────────┐
                            │/admin/  │ │/dashboard│
                            │approvals│ │/default │
                            └─────────┘ └─────────┘
```

## Route Protection Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  User Navigates to Route                        │
└────────────────────────────┬───────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            ┌───────▼────────┐ ┌─────▼──────────┐
            │  Public Route  │ │ Protected Route│
            │  (/, /login)   │ │  (/dashboard/* │
            └───────┬────────┘ │   /admin/*)    │
                    │          └─────┬──────────┘
                    │                │
                    │                ▼
                    │       ┌─────────────────┐
                    │       │   AuthGuard or  │
                    │       │   AdminGuard    │
                    │       └────────┬────────┘
                    │                │
                    │       ┌────────┴────────┐
                    │       │                 │
                    │  ┌────▼─────┐     ┌────▼─────┐
                    │  │useAuth   │     │  Logged  │
                    │  │Profile() │     │   Out    │
                    │  └────┬─────┘     └────┬─────┘
                    │       │                │
                    │       │                ▼
                    │       │        ┌────────────┐
                    │       │        │ Redirect   │
                    │       │        │ to /login  │
                    │       │        └────────────┘
                    │       │
                    │       ▼
                    │  ┌──────────┐
                    │  │  Check   │
                    │  │  Status  │
                    │  └────┬─────┘
                    │       │
                    │  ┌────┴────┐
                    │  │         │
                    │  ▼         ▼
                    │ ┌────┐ ┌────────┐
                    │ │Pend│ │Approved│
                    │ │ing │ └───┬────┘
                    │ └─┬──┘     │
                    │   │        │
                    │   │        ├─ If AdminGuard:
                    │   │        │  Check role=admin
                    │   │        │
                    │   ▼        ▼
                    │ ┌─────┐ ┌──────┐
                    │ │ Go  │ │ Render│
                    │ │/pend│ │ Page │
                    │ │ing  │ └──────┘
                    │ └─────┘
                    │
                    ▼
            ┌────────────┐
            │ Render Page│
            └────────────┘
```

## Admin Approval Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  Admin Logs In to System                        │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Redirected to      │
                  │ /admin/approvals   │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Fetch Pending Users│
                  │ FROM profiles      │
                  │ WHERE status=      │
                  │   'pending'        │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Display List of    │
                  │ Pending Users      │
                  └──────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐        ┌──────▼───────┐
        │ Admin Clicks   │        │ Admin Clicks │
        │  "承認"        │        │  "却下"      │
        │  (Approve)     │        │  (Reject)    │
        └───────┬────────┘        └──────┬───────┘
                │                        │
                └────────────┬───────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Call Edge Function │
                  │admin-approve-user  │
                  │ WITH:              │
                  │ - userId           │
                  │ - status           │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Edge Function      │
                  │ Validates:         │
                  │ 1. Caller is admin │
                  │ 2. User exists     │
                  └──────────┬─────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
            ┌─────▼─────┐         ┌────▼─────┐
            │  Valid    │         │ Invalid  │
            └─────┬─────┘         └────┬─────┘
                  │                    │
                  │                    ▼
                  │            ┌───────────────┐
                  │            │ Return Error  │
                  │            │ Show Toast    │
                  │            └───────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ UPDATE profiles  │
        │ SET status=?     │
        │ WHERE id=?       │
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │ Return Success   │
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │ Frontend:        │
        │ - Show toast     │
        │ - Refresh list   │
        │ - Remove user    │
        │   from pending   │
        └──────────────────┘
```

## Menu Filtering Flow

```
┌────────────────────────────────────────────────────────────────┐
│              Navigation Component Renders                       │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Import all menu    │
                  │ items from         │
                  │ menu-items/        │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Get current user   │
                  │ profile via        │
                  │ useAuthProfile()   │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ For each menu item:│
                  │ Check if has       │
                  │ 'adminOnly' flag   │
                  └──────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐        ┌──────▼───────┐
        │ adminOnly:true │        │adminOnly:false│
        │                │        │ or undefined  │
        └───────┬────────┘        └──────┬───────┘
                │                        │
        ┌───────┴────────┐               │
        │                │               │
   ┌────▼────┐     ┌─────▼─────┐        │
   │role:    │     │role:      │        │
   │admin    │     │nurse      │        │
   └────┬────┘     └─────┬─────┘        │
        │                │               │
        ▼                ▼               ▼
   ┌─────────┐     ┌─────────┐    ┌─────────┐
   │  Show   │     │  Hide   │    │  Show   │
   │  Item   │     │  Item   │    │  Item   │
   └─────────┘     └─────────┘    └─────────┘
```

## Data Access Control

```
┌────────────────────────────────────────────────────────────────┐
│              User Makes Database Query                          │
└────────────────────────────┬───────────────────────────────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ Query sent to      │
                  │ Supabase Postgres  │
                  └──────────┬─────────┘
                             │
                             ▼
                  ┌────────────────────┐
                  │ RLS Policies       │
                  │ Evaluate           │
                  └──────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼────────┐        ┌──────▼───────┐
        │  Status:       │        │  Status:     │
        │  'approved'    │        │  'pending' or│
        │                │        │  'rejected'  │
        └───────┬────────┘        └──────┬───────┘
                │                        │
        ┌───────┴────────┐               │
        │                │               │
   ┌────▼────┐     ┌─────▼─────┐        │
   │role:    │     │role:      │        │
   │admin    │     │nurse      │        │
   └────┬────┘     └─────┬─────┘        │
        │                │               │
        ▼                ▼               ▼
   ┌─────────┐     ┌─────────┐    ┌─────────┐
   │ Access  │     │ Limited │    │  Denied │
   │  All    │     │ Access  │    │  (401)  │
   │  Data   │     │ (Own    │    └────┬────┘
   └─────────┘     │  Data)  │         │
                   └─────────┘         ▼
                                ┌──────────────┐
                                │ Frontend     │
                                │ RLSError     │
                                │ Boundary     │
                                │ Catches      │
                                └──────┬───────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ Show Friendly│
                                │ Error Message│
                                │ "承認が必要" │
                                └──────────────┘
```

## Component Hierarchy

```
App Root
│
├── AuthProvider (Context)
│   │
│   ├── Public Routes
│   │   ├── Landing Page (/)
│   │   ├── Login Page (/login)
│   │   │   └── OAuth Buttons
│   │   ├── Register Page (/register)
│   │   └── OAuth Callback (/auth/callback)
│   │
│   ├── Auth Routes (No Guard)
│   │   └── Pending Approval (/pending-approval)
│   │
│   └── Protected Routes
│       │
│       ├── Dashboard Routes
│       │   └── AuthGuard
│       │       └── DashboardLayout
│       │           ├── Header
│       │           │   └── UserProfile (shows role badge)
│       │           ├── Sidebar
│       │           │   └── Navigation (filtered by role)
│       │           └── Content
│       │               ├── /dashboard/default
│       │               └── Other Dashboard Pages
│       │
│       └── Admin Routes
│           └── AdminGuard
│               └── DashboardLayout
│                   └── Content
│                       ├── /admin/approvals
│                       │   ├── Pending Users List
│                       │   ├── Approve Button
│                       │   └── Reject Button
│                       │
│                       └── /admin/users
│                           ├── Users List (All)
│                           ├── Search & Filters
│                           ├── Status Change
│                           └── Role Change
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                        Security Layers                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Route Guards (Frontend)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • AuthGuard - checks session + status                    │  │
│  │ • AdminGuard - checks session + status + role            │  │
│  │ • Redirects unauthorized users                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  Layer 2: Menu Filtering (Frontend)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Hides admin menu items from nurses                     │  │
│  │ • Checks profile.role before rendering                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  Layer 3: Edge Functions (Backend)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Validates JWT token                                     │  │
│  │ • Checks user is admin before approving                  │  │
│  │ • Server-side validation                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  Layer 4: RLS Policies (Database)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Enforced at database level                             │  │
│  │ • Cannot be bypassed from frontend                        │  │
│  │ • Checks status='approved' for data access               │  │
│  │ • Checks role='admin' for admin operations               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                       ⚠️ IMPORTANT ⚠️
        Frontend guards are for UX convenience only!
         TRUE SECURITY comes from RLS policies and
              server-side validation in Edge Functions
```

This multi-layered approach ensures:
1. **Good UX** - Users see appropriate UI immediately
2. **Security** - Database enforces access control
3. **Validation** - Edge Functions validate actions
4. **Performance** - Frontend doesn't load unauthorized data


