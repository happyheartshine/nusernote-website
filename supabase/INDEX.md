# Supabase Backend - Documentation Index

## 📚 Welcome

This is the complete hybrid auth/approval backend for NurseNote. All documentation is organized here for easy navigation.

## 🚀 Getting Started

**New to this project?** Start here:

1. **[README.md](./README.md)** - Project overview and quick start
2. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment
3. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Common commands and examples

## 📖 Documentation Files

### Essential Guides

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [README.md](./README.md) | Project overview and structure | First time setup |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Complete deployment instructions | Before deploying |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Quick commands and API examples | Daily reference |
| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | Team migration and code changes | When integrating |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | What was delivered | Project handoff |
| [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) | Visual system diagrams | Understanding flow |

### Quick Navigation

#### 🎯 "I want to..."

- **Deploy the backend** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Understand the architecture** → [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)
- **Find quick commands** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Integrate with frontend** → [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **See what was built** → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Troubleshoot issues** → [DEPLOYMENT_GUIDE.md#troubleshooting](./DEPLOYMENT_GUIDE.md)

#### 🔍 "I need info about..."

- **Database schema** → [README.md#database-schema](./README.md)
- **API endpoints** → [DEPLOYMENT_GUIDE.md#api-reference](./DEPLOYMENT_GUIDE.md)
- **RLS policies** → [MIGRATION_GUIDE.md#updated-rls-policies](./MIGRATION_GUIDE.md)
- **Edge Functions** → [README.md#edge-functions-api](./README.md)
- **Security model** → [DEPLOYMENT_GUIDE.md#security-model](./DEPLOYMENT_GUIDE.md)
- **Helper functions** → [IMPLEMENTATION_SUMMARY.md#helper-functions](./IMPLEMENTATION_SUMMARY.md)

#### 👨‍💻 "I'm a..."

- **Backend Developer** → Start with [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Frontend Developer** → Start with [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **DevOps Engineer** → Start with [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Project Manager** → Start with [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **New Team Member** → Start with [README.md](./README.md)

## 📁 Code Structure

```
supabase/
├── migrations/                     # Database migrations (SQL)
│   ├── 20231225000001_create_profiles_table.sql
│   ├── 20231225000002_create_profile_trigger.sql
│   ├── 20231225000003_create_helper_functions.sql
│   ├── 20231225000004_create_profiles_rls_policies.sql
│   ├── 20231225000005_update_soap_records_rls.sql
│   └── 20231225000006_backfill_existing_users.sql
│
├── functions/                      # Edge Functions (TypeScript/Deno)
│   ├── _shared/                   # Shared utilities
│   │   ├── cors.ts
│   │   ├── supabase.ts
│   │   └── auth.ts
│   ├── admin-approve-user/
│   │   └── index.ts
│   ├── admin-list-users/
│   │   └── index.ts
│   └── admin-list-pending/
│       └── index.ts
│
├── DEPLOYMENT_GUIDE.md             # Complete deployment guide
├── QUICK_REFERENCE.md              # Quick commands and examples
├── MIGRATION_GUIDE.md              # Team migration guide
├── IMPLEMENTATION_SUMMARY.md       # What was delivered
├── ARCHITECTURE_DIAGRAMS.md        # Visual diagrams
├── README.md                       # Project overview
└── INDEX.md                        # This file
```

## 🎓 Learning Path

### For Complete Beginners

1. Read [README.md](./README.md) - Understand what this is
2. Read [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - See how it works
3. Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Learn to deploy
4. Try [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) examples
5. Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Integrate with frontend

### For Experienced Developers

1. Skim [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - See what's built
2. Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deploy quickly
3. Reference [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - As needed
4. Check [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - For deep dive

## 🔑 Key Concepts

### Hybrid Architecture
- Frontend uses Supabase Auth directly
- Database secured with RLS
- Admin operations via Edge Functions with service role

### Approval Workflow
- New users start as "pending"
- Admins approve/reject users
- Only approved users access data

### Security Layers
1. **Authentication** - Supabase Auth (JWT)
2. **Authorization** - RLS Policies (role + status)
3. **Admin Operations** - Edge Functions (service role)

## 📊 System Overview

```
User Signs Up → Pending Profile Created → Admin Approves → User Gets Access
     │                    │                      │               │
     │                    │                      │               │
 auth.users          profiles table      Edge Function    RLS Policies
                    (role, status)      (service role)    (enforce)
```

## 🛠️ Common Tasks

### Deploy Backend
```bash
supabase db push
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending
```

### Create Admin User
```sql
UPDATE profiles SET role='admin', status='approved' 
WHERE email='admin@example.com';
```

### Test Edge Function
```bash
curl 'https://PROJECT.supabase.co/functions/v1/admin-list-pending' \
  -H "Authorization: Bearer JWT_TOKEN"
```

### Check User Status
```sql
SELECT email, role, status FROM profiles WHERE email='user@example.com';
```

## 🔍 Finding Information

### Database

- **Schema** → [README.md](./README.md) → "Database Schema"
- **Migrations** → `supabase/migrations/` directory
- **RLS Policies** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → "Security Model"

### Edge Functions

- **API Reference** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → "API Reference"
- **Code** → `supabase/functions/` directory
- **Examples** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) → "Frontend Integration Examples"

### Security

- **Overview** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → "Security Model"
- **RLS Details** → [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) → "RLS Policy Hierarchy"
- **Best Practices** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → "Best Practices"

### Troubleshooting

- **Common Issues** → [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → "Troubleshooting"
- **Quick Fixes** → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) → "Troubleshooting Quick Fixes"
- **Migration Issues** → [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) → "Common Issues and Solutions"

## 📞 Support Resources

### Documentation Files

| Issue | Document | Section |
|-------|----------|---------|
| Can't deploy | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deployment Steps |
| Edge Function errors | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Troubleshooting |
| RLS not working | [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | Testing the Migration |
| Frontend integration | [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | Frontend Changes Required |
| Understanding flow | [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) | All Diagrams |

### External Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## ✅ Deployment Checklist

Use this quick checklist when deploying:

- [ ] Install Supabase CLI
- [ ] Login and link project
- [ ] Run database migrations
- [ ] Set Edge Function secrets
- [ ] Deploy Edge Functions
- [ ] Create first admin user
- [ ] Test signup creates pending profile
- [ ] Test pending user blocked from data
- [ ] Test admin can approve users
- [ ] Test approved user can access data
- [ ] Update frontend integration
- [ ] Test end-to-end flow

Full details: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🎯 Quick Start (TL;DR)

```bash
# 1. Deploy database
supabase db push

# 2. Set secrets
supabase secrets set SUPABASE_URL=https://...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set SUPABASE_ANON_KEY=...

# 3. Deploy functions
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending

# 4. Create admin (in SQL Editor)
# UPDATE profiles SET role='admin', status='approved' WHERE email='your-email';
```

Done! See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for details.

## 📝 Document Summaries

### [README.md](./README.md)
Project overview, directory structure, database schema, quick start, API summary.

### [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
Complete deployment instructions, API reference, security model, troubleshooting, best practices.

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
Quick commands, SQL queries, frontend examples, environment variables, troubleshooting fixes.

### [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
What changed, frontend code updates, backend code updates, testing procedures, rollback plan.

### [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
What was delivered, features implemented, schema, API endpoints, security highlights.

### [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)
Visual diagrams of system architecture, flows, security model, component dependencies.

## 🎉 You're All Set!

This backend is production-ready. Choose your starting point above and dive in!

**Need help?** Check the troubleshooting sections in:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

**Last Updated**: December 25, 2024
**Version**: 1.0.0
**Status**: Production Ready ✅

