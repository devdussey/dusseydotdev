# WordHex Complete Setup Guide

## 🚀 Quick Start (30 minutes)

### Step 1: Create Supabase Project (5 min)
1. Go to https://supabase.com → Sign in/Create account
2. Click "New Project"
3. Fill in:
   - Project name: `wordhex`
   - Database password: (strong password)
   - Region: closest to you
4. Wait 2-3 minutes for database to initialize

### Step 2: Run Database Setup Script (5 min)
1. In Supabase Dashboard → **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy entire contents of `supabase-setup.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Wait for completion (green checkmark)

✅ **Result:** 6 tables created with RLS policies enabled

### Step 3: Get API Credentials (5 min)
1. Go to **Settings** → **API** (left sidebar)
2. Under "Project API keys":
   - Copy **Project URL** → save as `VITE_SUPABASE_URL`
   - Copy **Anon Key** → save as `VITE_SUPABASE_KEY`
3. Copy **Service Role Key** → save as `SUPABASE_SERVICE_ROLE_KEY` (keep SECRET)

### Step 4: Configure Netlify Environment (5 min)
1. Go to https://app.netlify.com/sites/dussey.dev (or your site)
2. Click **Settings** → **Build & Deploy** → **Environment**
3. Add variables:
   ```
   VITE_SUPABASE_URL = (paste from step 3)
   VITE_SUPABASE_KEY = (paste from step 3)
   ```
4. Click **Redeploy site** (or push new commit to trigger)

### Step 5: Verify Deployment (5 min)
1. Visit https://wordhex.dussey.dev
2. Open browser DevTools → Network/Console
3. Check for errors (should have none)
4. Success! 🎉

---

## 📚 Complete Setup Details

### Architecture Overview
```
Wordhex Game (Frontend)
        ↓
Supabase Data API (HTTP)
        ↓
Supabase Database (PostgreSQL)
        ↓
Row-Level Security (RLS)
```

### Database Schema
See `RLS_SECURITY.md` for detailed table explanations.

**Key tables:**
- `public.users` - Player profiles (backend only)
- `public.words` - Word dictionary (backend only, for validation)
- `api.games` - Active games (frontend accessible)
- `api.game_results` - Scores (frontend accessible)
- `api.leaderboard` - Rankings (public)
- `api.game_invites` - Invitations (private)

### Security Model

**Frontend (Data API):**
- Accesses tables in `api` schema via HTTP
- RLS enforces: can only see own data + public games
- Uses `VITE_SUPABASE_KEY` (public anon key)

**Backend (Connection String):**
- Direct PostgreSQL access via `DATABASE_URL`
- Bypasses RLS using service role
- Uses `SUPABASE_SERVICE_ROLE_KEY` (KEEP SECRET)
- Validates words, calculates scores, updates leaderboard

**Word Validation Security:**
- Word dictionary in `public` schema (hidden from frontend)
- Frontend CANNOT access word list
- Backend validates words server-side
- Prevents cheating via frontend inspection

---

## 🔐 Security Checklist

Before going to production:

- [ ] All environment variables configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NEVER committed to repo
- [ ] RLS policies enabled on all tables
- [ ] Discord OAuth configured (if using authentication)
- [ ] HTTPS enabled (Netlify does this automatically)
- [ ] CSP headers set (`_headers` file in workhex folder)
- [ ] Backend service role access restricted to server-only
- [ ] Database backups enabled (Supabase → Settings → Backups)
- [ ] Monitoring/logging enabled

---

## 🎮 Testing

### Test Frontend Connection
```javascript
// In browser console at wordhex.dussey.dev
const supabase = window.supabase;
const { data: games } = await supabase.from('games').select('*');
console.log(games);
// Should show any active games (or empty array)
```

### Test Backend Connection
```javascript
// In backend Node.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query('SELECT * FROM public.words LIMIT 1');
console.log(result.rows);
// Should show a word from dictionary
```

### Test RLS Protection
1. Login as Player 1 → Create a game
2. Open incognito → Login as Player 2
3. Player 2 should NOT be able to modify Player 1's game
4. Try to update another player's score → Should be blocked

---

## 📝 Environment Variables

### For Netlify (Frontend)
Dashboard → Settings → Build & Deploy → Environment

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGc...
VITE_DISCORD_CLIENT_ID=1234567890
```

### For Backend Server (.env file)
```
DATABASE_URL=postgresql://postgres:password@db...supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NODE_ENV=production
```

### For Local Development (.env.local)
Copy `.env.example` to `.env.local` and fill with your values.

---

## 🚨 Troubleshooting

### "Supabase URL not found" error
**Problem:** Frontend can't connect to Supabase
**Solution:**
1. Check `VITE_SUPABASE_URL` is correct (starts with `https://`)
2. Verify Supabase project is active (check Dashboard)
3. Check API key hasn't expired (Settings → API)

### "RLS policy violation" error
**Problem:** Can't access games table
**Solution:**
1. Are you logged in? (auth.uid() must exist)
2. Do you own the game or are you a player?
3. Check RLS policies are enabled: Supabase → Settings → Database → RLS

### "Connection refused" on backend
**Problem:** Cannot connect to database via Connection String
**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check password contains no special characters (or URL-encoded)
3. Verify IP whitelist (Supabase → Settings → Network)
4. Try connecting with psql: `psql $DATABASE_URL`

### Word validation not working
**Problem:** All words accepted as valid
**Solution:**
1. Check `public.words` table has data
2. Verify backend is querying correct table
3. Ensure RLS policy prevents frontend access
4. Backend must use service role key to read words

---

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Data API Documentation](https://supabase.com/docs/guides/api)
- [Discord Activities Docs](https://discord.com/developers/docs/activities/)

---

## ✅ Verification Checklist

Run through this to verify everything works:

- [ ] Supabase project created
- [ ] Database tables exist in SQL Editor
- [ ] API keys obtained from Settings → API
- [ ] Netlify environment variables set
- [ ] Site redeployed with new variables
- [ ] wordhex.dussey.dev loads without console errors
- [ ] Data API connects in browser console
- [ ] RLS policies working (login test in 2 browsers)
- [ ] Backend can connect via DATABASE_URL
- [ ] Word validation returns results from public.words

---

## 🎯 Next Steps

1. **Discord OAuth** → Set up authentication
2. **Backend API** → Deploy Node.js server for game logic
3. **WebSocket Server** → Real-time multiplayer sync
4. **Game Logic** → Implement scoring and validation
5. **Monitoring** → Set up error tracking (Sentry)

---

**Questions?** Check `RLS_SECURITY.md` for detailed security info, or `.env.example` for variable reference.
