# WordHex Deployment Checklist

## ✅ Phase 1: Supabase Setup (5 minutes)

- [ ] Supabase project created at https://wrpskqhpykojfhwlumia.supabase.co
- [ ] API credentials obtained
  - URL: https://wrpskqhpykojfhwlumia.supabase.co
  - Anon Key: eyJhbGc... (see NETLIFY_ENV_SETUP.md)

## ✅ Phase 2: Netlify Configuration (5 minutes)

Follow **NETLIFY_ENV_SETUP.md**:

- [ ] Go to Netlify app.netlify.com
- [ ] Select dussey.dev site
- [ ] Settings → Build & Deploy → Environment
- [ ] Add `VITE_SUPABASE_URL` variable
- [ ] Add `VITE_SUPABASE_KEY` variable
- [ ] Click Save
- [ ] Trigger manual deploy
- [ ] Wait for deployment to complete

## ✅ Phase 3: Database Setup (5 minutes)

Follow **workhex/SETUP_GUIDE.md**:

- [ ] Go to Supabase SQL Editor
- [ ] Create new query
- [ ] Copy `supabase-setup.sql` from wordhex folder
- [ ] Paste into SQL Editor
- [ ] Click Run
- [ ] Verify all tables created in Table Editor
  - [ ] public.users
  - [ ] public.words
  - [ ] api.games
  - [ ] api.game_results
  - [ ] api.leaderboard
  - [ ] api.game_invites

## ✅ Phase 4: Verification (5 minutes)

- [ ] Visit https://wordhex.dussey.dev
- [ ] Open DevTools (F12) → Console
- [ ] No errors about undefined Supabase variables
- [ ] Run in console: `console.log(import.meta.env.VITE_SUPABASE_URL)`
- [ ] Should display: `https://wrpskqhpykojfhwlumia.supabase.co`

## ✅ Phase 5: RLS Security Check (5 minutes)

- [ ] Go to Supabase SQL Editor
- [ ] Run: `SELECT * FROM information_schema.tables WHERE table_schema IN ('api', 'public');`
- [ ] Verify all 6 tables exist
- [ ] Go to Authentication → Policies
- [ ] Verify RLS policies exist for each table

## 📋 Post-Deployment Tasks

### Frontend Features (Not yet implemented)
- [ ] Add Discord OAuth authentication
- [ ] Implement game UI (board, scoring, timer)
- [ ] Add real-time multiplayer sync
- [ ] Create game mode selection
- [ ] Add leaderboard display

### Backend Services (To be deployed)
- [ ] Node.js/Python API server
- [ ] Word validation service
- [ ] Game state management
- [ ] Discord Activity integration
- [ ] WebSocket server for real-time updates

### Database Operations
- [ ] Seed word dictionary (public.words table)
- [ ] Set up automated backups
- [ ] Configure monitoring/alerting
- [ ] Test RLS policies with multiple users

## 🔒 Security Checklist

- [ ] .env.local NOT committed to Git (.gitignore configured)
- [ ] VITE_SUPABASE_KEY is anon key (safe to expose)
- [ ] RLS enabled on all api schema tables
- [ ] public schema tables have RLS disabled (backend only)
- [ ] Word dictionary protected (hidden from frontend)
- [ ] Game scores protected (backend validation only)
- [ ] Service role key kept secret (not in .env)
- [ ] HTTPS enforced (Netlify default)
- [ ] CORS headers configured in netlify.toml
- [ ] CSP headers configured in wordhex/_headers

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| SETUP_GUIDE.md | Complete step-by-step setup guide |
| RLS_SECURITY.md | Security policies explained in detail |
| NETLIFY_ENV_SETUP.md | Netlify configuration instructions |
| supabase-setup.sql | Database schema (copy-paste ready) |
| .env.example | Environment variables reference |

## 🚀 Current Status

**Frontend:** ✅ Deployed to https://wordhex.dussey.dev
**Database:** ⏳ Ready to setup (awaiting SQL script execution)
**Backend:** ⏳ Pending (Node.js server deployment)
**Authentication:** ⏳ Pending (Discord OAuth setup)
**Real-time:** ⏳ Pending (WebSocket server)

## 📞 Quick Links

- Supabase Dashboard: https://supabase.com/dashboard
- Netlify Dashboard: https://app.netlify.com
- WordHex Frontend: https://wordhex.dussey.dev
- GitHub Repo: https://github.com/devdussey/dusseydotdev

## ⏱️ Total Setup Time

- Phase 1 (Supabase): 5 min
- Phase 2 (Netlify): 5 min
- Phase 3 (Database): 5 min
- Phase 4 (Verify): 5 min
- Phase 5 (Security): 5 min

**Total: 25 minutes**

---

**Next: Follow NETLIFY_ENV_SETUP.md to complete Phase 2** ✨
