# Supabase Backend - Environment Variables Template

# This file documents all environment variables needed for the hybrid auth/approval backend.
# Copy the relevant sections to your actual .env files (DO NOT commit actual keys!).

# ==============================================================================
# FRONTEND ENVIRONMENT VARIABLES (.env.local in project root)
# ==============================================================================
# These are safe to expose to the browser (prefixed with NEXT_PUBLIC_)

# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase anonymous/public key (safe for frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# ==============================================================================
# EDGE FUNCTIONS SECRETS (Set via Supabase CLI)
# ==============================================================================
# NEVER expose these in frontend code! Set using: supabase secrets set KEY=value

# Your Supabase project URL (same as frontend)
SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase service role key (KEEP SECRET - has admin privileges!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Supabase anonymous key (for user client in Edge Functions)
SUPABASE_ANON_KEY=your-anon-key-here

# ==============================================================================
# HOW TO GET THESE VALUES
# ==============================================================================

# 1. Go to your Supabase Dashboard: https://app.supabase.com
# 2. Select your project
# 3. Navigate to: Settings → API

# You'll find:
# - Project URL (use for both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL)
# - anon/public key (use for both SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY)
# - service_role key (use ONLY for SUPABASE_SERVICE_ROLE_KEY - NEVER expose to frontend!)

# ==============================================================================
# SETTING UP ENVIRONMENT VARIABLES
# ==============================================================================

# Frontend (.env.local):
# ----------------------
# 1. Create .env.local in project root
# 2. Add NEXT_PUBLIC_* variables
# 3. Fill in your actual values
# 4. Restart your Next.js dev server

# Edge Functions (Supabase Secrets):
# -----------------------------------
# Run these commands in your terminal:

# supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# supabase secrets set SUPABASE_ANON_KEY=your-anon-key

# Verify secrets were set:
# supabase secrets list

# ==============================================================================
# SECURITY WARNINGS
# ==============================================================================

# ⚠️  NEVER commit .env files with actual keys to Git!
# ⚠️  NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend!
# ⚠️  NEVER hardcode keys in your source code!
# ⚠️  NEVER share service role keys in Slack, email, or public channels!

# ✅  DO add .env.local to .gitignore
# ✅  DO use environment variables for all keys
# ✅  DO rotate keys if they're ever exposed
# ✅  DO use different keys for development and production

# ==============================================================================
# TROUBLESHOOTING
# ==============================================================================

# "Missing Supabase environment variables"
# → Check that .env.local exists and has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# → Restart your Next.js dev server after changing .env.local

# Edge Function: "Missing Supabase environment variables"
# → Run: supabase secrets list
# → If empty, set secrets using: supabase secrets set KEY=value

# "Invalid API key"
# → Double-check you copied the full key (they're very long)
# → Make sure you're using the correct key for the environment
# → Check for extra spaces or newlines in the key

# ==============================================================================
# REFERENCE LINKS
# ==============================================================================

# Supabase Environment Variables Guide:
# https://supabase.com/docs/guides/getting-started/environment-variables

# Supabase CLI Secrets:
# https://supabase.com/docs/reference/cli/supabase-secrets

# Next.js Environment Variables:
# https://nextjs.org/docs/basic-features/environment-variables

