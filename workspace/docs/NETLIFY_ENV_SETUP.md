# Netlify Environment Variables Setup

Your Supabase credentials have been added to the project locally. Now you need to add them to Netlify so the site can access Supabase in production.

## 🔐 Your Credentials

```
URL: https://wrpskqhpykojfhwlumia.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycHNrcWhweWtvamZod2x1bWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODUzNTYsImV4cCI6MjA3OTA2MTM1Nn0.qiNjMO3KyjDGmNRqtxlJFAWfnL9IC-7vcbYQaomR9HA
```

## ⚙️ Add to Netlify

1. Go to https://app.netlify.com
2. Select your **dussey.dev** site
3. Click **Settings** (top menu)
4. Go to **Build & Deploy** → **Environment** (left sidebar)
5. Click **Edit variables**
6. Add these two variables:

### Variable 1: Supabase URL
```
Name:  VITE_SUPABASE_URL
Value: https://wrpskqhpykojfhwlumia.supabase.co
```

### Variable 2: Supabase Key
```
Name:  VITE_SUPABASE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycHNrcWhweWtvamZod2x1bWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODUzNTYsImV4cCI6MjA3OTA2MTM1Nn0.qiNjMO3KyjDGmNRqtxlJFAWfnL9IC-7vcbYQaomR9HA
```

7. Click **Save**
8. Go to **Builds & Deploys** → click **Trigger deploy** → **Deploy site**

## ✅ Verify

After redeploy:
1. Visit https://workhex.dussey.dev
2. Open DevTools (F12) → Console
3. Type: `console.log(import.meta.env.VITE_SUPABASE_URL)`
4. Should show your Supabase URL
5. No errors about missing variables

## 🚀 Next Step

After Netlify redeploys, run the SQL setup script:

**Go to your Supabase project:**
1. Dashboard → SQL Editor
2. Create new query
3. Copy entire `supabase-setup.sql` from wordhex folder
4. Paste into SQL Editor
5. Click Run

This creates all database tables with RLS security.

## ❌ Common Issues

### Variables not appearing
- Clear browser cache (Ctrl+Shift+Del)
- Redeploy site manually
- Wait 1-2 minutes for deploy to complete

### "VITE_SUPABASE_URL is undefined"
- Check variable names exactly match (case-sensitive)
- Verify values are pasted completely (no truncation)
- Redeploy after adding variables

### Still getting errors
- Check SQL setup script ran successfully
- Verify tables exist in Supabase Table Editor
- Check RLS policies are enabled
