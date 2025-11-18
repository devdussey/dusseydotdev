# WordHex Supabase Setup Guide

## Overview
WordHex uses **Supabase (PostgreSQL)** for backend data persistence with enterprise-grade security using Row-Level Security (RLS).

**Key Features:**
- Public schema (backend only) - Players, Word Dictionary
- API schema (frontend) - Games, Scores, Leaderboard, Invites
- Row-Level Security (RLS) policies for data protection
- Real-time subscriptions for multiplayer sync

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **SETUP_GUIDE.md** | 📖 Complete step-by-step setup (START HERE) |
| **RLS_SECURITY.md** | 🔐 Detailed security & RLS policies explained |
| **supabase-setup.sql** | 🗄️ Full database schema with RLS policies |
| **.env.example** | 🔑 Environment variables reference |

## ⚡ Quick Start (5 steps)

1. **Create Supabase Project** → https://supabase.com
2. **Run setup script** → Copy `supabase-setup.sql` to Supabase SQL Editor
3. **Get API keys** → Settings → API
4. **Add to Netlify** → Settings → Build & Deploy → Environment
5. **Redeploy** → Push commit or manual redeploy

**Done!** Database is secured with RLS and ready to use.

## 🔒 Security Architecture

### Schema Organization
- **public** schema: Backend only (users, words)
- **api** schema: Frontend accessible (games, results, leaderboard)
- **RLS enabled** on all api schema tables
- **RLS disabled** on public schema (backend/service role only)

### Frontend Access
```javascript
// Frontend uses Data API (HTTP)
const games = await supabase.from('api.games').select('*');
// RLS automatically filters by auth.uid()
```

### Backend Access
```javascript
// Backend uses Connection String (PostgreSQL)
const words = await pool.query('SELECT * FROM public.words');
// Service role bypasses RLS
```

## 📝 Environment Variables

### Netlify (Frontend)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=eyJhbGc... (anon key - safe to expose)
```

### Backend Server
```
DATABASE_URL=postgresql://postgres...supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (KEEP SECRET!)
```

See `.env.example` for complete reference.

## 🗄️ Database Schema

### Public Schema (Backend Only)
- **users** - Player profiles with Discord IDs
- **words** - Word dictionary for validation

### API Schema (Frontend)
- **games** - Active/completed games
- **game_results** - Scores and word submissions
- **leaderboard** - Public rankings
- **game_invites** - Invitation system

## 🔐 Row-Level Security (RLS)

All tables have RLS policies enforcing:
- ✅ Players see only their data
- ✅ Game hosts control their games
- ✅ Scores protected from tampering
- ✅ Word dictionary hidden from frontend
- ✅ Leaderboard public & backend-managed

**See `RLS_SECURITY.md` for detailed policy breakdown.**

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] supabase-setup.sql executed (all tables created)
- [ ] RLS policies visible in Auth Policies
- [ ] API keys obtained from Settings → API
- [ ] Environment variables added to Netlify
- [ ] wordhex.dussey.dev deploys without errors
- [ ] Data API connects in browser console

## 🚨 Important Security Notes

1. **Never commit actual .env files** - Use Netlify environment variables instead
2. **Keep SERVICE_ROLE_KEY secret** - Never expose to frontend
3. **Backend validates words** - Frontend cannot access word dictionary
4. **Enable backups** - Supabase Settings → Backups
5. **Monitor RLS violations** - Check logs for unauthorized access attempts

## 📖 Next Steps

1. **Follow SETUP_GUIDE.md** for detailed steps
2. **Read RLS_SECURITY.md** to understand security model
3. **Configure Discord OAuth** for authentication
4. **Deploy backend API** on Railway/Vercel
5. **Test multiplayer flow** with real players

---

**Questions?** See `RLS_SECURITY.md` for detailed explanations or `SETUP_GUIDE.md` for step-by-step instructions.
