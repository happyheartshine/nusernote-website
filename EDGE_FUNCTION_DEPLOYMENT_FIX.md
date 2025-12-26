# 🚀 Edge Function Deployment Guide - CORS Fix

## Issues Fixed

### 1. ✅ CORS Headers Missing `Access-Control-Allow-Methods`
**File:** `supabase/functions/_shared/cors.ts`  
**Fix:** Added `'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'`

### 2. ✅ Wrong Parameter Name in Frontend
**Files:** 
- `src/app/(dashboard)/admin/approvals/page.jsx`
- `src/app/(dashboard)/admin/users/page.jsx`

**Fix:** Changed `userId` to `user_id` to match Edge Function API

---

## 🔧 What Was Changed

### Backend (Edge Function - CORS):
```typescript
// Before (Missing)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// After (Fixed)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

### Frontend (API Calls):
```javascript
// Before (Wrong parameter name)
supabase.functions.invoke('admin-approve-user', {
  body: { userId, status: 'approved' }
});

// After (Correct parameter name)
supabase.functions.invoke('admin-approve-user', {
  body: { user_id: userId, status: 'approved' }
});
```

---

## 🚀 Deploy the Fixed Edge Functions

**IMPORTANT:** The Edge Functions need to be redeployed to Supabase for the CORS fix to take effect.

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
# 1. Make sure you're logged in
supabase login

# 2. Link to your project (if not already linked)
supabase link --project-ref skqlxkmramgzdqjjqrui

# 3. Deploy the Edge Function
supabase functions deploy admin-approve-user

# 4. Verify deployment
supabase functions list
```

### Option 2: Deploy All Functions at Once

```bash
# Deploy all functions in the functions directory
supabase functions deploy
```

### Option 3: Manual Deployment via Dashboard

If CLI doesn't work:

1. Go to: https://app.supabase.com/project/skqlxkmramgzdqjjqrui
2. Navigate to: **Edge Functions**
3. Click on `admin-approve-user`
4. Click **"Deploy new version"**
5. Upload the updated function code from `supabase/functions/admin-approve-user/`

---

## ✅ Verify the Fix

### 1. Check Function Logs
After deployment, check the logs:
```bash
supabase functions logs admin-approve-user
```

Or via Dashboard: Edge Functions → admin-approve-user → Logs

### 2. Test the Admin Approval Flow

1. **Create a test user** (if you haven't):
   - Go to registration page
   - Register with a new email
   - User should have `status='pending'`

2. **Login as admin**:
   - Make sure your account is an admin with approved status
   - If not, run this SQL:
   ```sql
   UPDATE public.profiles
   SET role = 'admin', status = 'approved'
   WHERE email = 'your-email@example.com';
   ```

3. **Test approval**:
   - Navigate to `/admin/approvals`
   - You should see the pending user
   - Click the "承認" (Approve) button
   - **Expected:** Success message, user is approved
   - **No CORS errors** in console

4. **Check the result**:
   ```sql
   SELECT id, email, role, status FROM profiles WHERE email = 'test-user@example.com';
   -- Should show status='approved'
   ```

---

## 🐛 Troubleshooting

### Still Getting CORS Errors?

1. **Check Edge Function was deployed:**
   ```bash
   supabase functions list
   ```
   Should show `admin-approve-user` with recent deploy time

2. **Check the CORS headers in the response:**
   - Open Browser DevTools → Network tab
   - Click approve button
   - Check the OPTIONS request (preflight)
   - Response headers should include:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE`

3. **Clear browser cache and hard reload:**
   - Chrome/Edge: `Ctrl + Shift + R`
   - Firefox: `Ctrl + F5`

### Getting "Missing required fields" Error?

Make sure the frontend is sending `user_id` (not `userId`):
```javascript
// Check in src/app/(dashboard)/admin/approvals/page.jsx line 42
body: { user_id: userId, status: 'approved' }  // ✅ Correct
// NOT: body: { userId, status: 'approved' }   // ❌ Wrong
```

### Getting Authentication Errors?

1. **Check you're logged in as admin:**
   ```sql
   SELECT role, status FROM profiles WHERE email = 'your-email@example.com';
   -- Should return: role='admin', status='approved'
   ```

2. **Check your session is valid:**
   - Open DevTools → Application → Local Storage
   - Look for `supabase.auth.token`
   - Should have a recent timestamp

---

## 📋 Deployment Checklist

- [x] Fixed CORS headers in `supabase/functions/_shared/cors.ts`
- [x] Fixed parameter names in admin pages
- [x] Added error handling in frontend
- [ ] Deploy Edge Function to Supabase (YOU ARE HERE)
- [ ] Test approval workflow
- [ ] Verify no CORS errors
- [ ] Test with pending user

---

## 🎯 Quick Deploy Commands (Copy-Paste)

```bash
# Windows (PowerShell) or Git Bash
cd C:\Work\NurseNote-Website
supabase login
supabase link --project-ref skqlxkmramgzdqjjqrui
supabase functions deploy admin-approve-user

# Verify
supabase functions list
```

---

## 📚 Additional Resources

- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Deployment Guide:** `supabase/DEPLOYMENT_GUIDE.md`

---

## ✅ Expected Result After Deployment

1. ✅ No CORS errors when clicking approve/reject buttons
2. ✅ Users can be approved successfully
3. ✅ Toast messages show success/error
4. ✅ Pending users list updates automatically
5. ✅ Approved users can login and access dashboard

---

## 🎉 Summary

**Fixed in Local Code (Already Applied):**
- ✅ CORS headers updated
- ✅ Parameter names fixed
- ✅ Error handling improved

**Needs Deployment:**
- ⏳ Run `supabase functions deploy admin-approve-user`

**After deployment, everything should work!** 🚀

