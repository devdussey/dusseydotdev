# Your Discord OAuth Setup - Action Items

## ✅ Your Discord Application

**Application Name:** WordHex
**Client ID:** 1440392506553405580
**Client Secret:** TdeBYPxJ6IUmz74RDIn_whjumZn6I184

⚠️ **IMPORTANT:** Never commit the Client Secret to Git. It's kept in Netlify environment variables only.

---

## 📋 Required Actions (15 minutes)

### 1. Add Redirect URL to Discord App (2 min)

1. Go to Discord Developer Portal: https://discord.com/developers/applications
2. Select your **WordHex** application
3. Go to **OAuth2** → **Redirects**
4. Click **Add Redirect**
5. Enter:
   ```
   https://dussey.dev/.netlify/functions/discord-auth
   ```
6. Click Save

**Status:** ⏳ Waiting - Need to do this step

---

### 2. Add Environment Variables to Netlify (3 min)

1. Go to **Netlify Dashboard**: https://app.netlify.com
2. Select **dussey.dev** site
3. **Settings** → **Build & Deploy** → **Environment**
4. Click **Edit variables**
5. Add these variables:

| Name | Value |
|------|-------|
| DISCORD_CLIENT_ID | 1440392506553405580 |
| DISCORD_CLIENT_SECRET | TdeBYPxJ6IUmz74RDIn_whjumZn6I184 |
| DISCORD_REDIRECT_URI | https://dussey.dev/.netlify/functions/discord-auth |

6. Also verify these are set (Supabase credentials):

| Name | Value |
|------|-------|
| VITE_SUPABASE_URL | https://wrpskqhpykojfhwlumia.supabase.co |
| VITE_SUPABASE_KEY | (your anon key) |
| SUPABASE_SERVICE_ROLE_KEY | (your service role key) |

7. Click **Save**

**Status:** ⏳ Waiting - Need to do this in Netlify

---

### 3. Deploy Changes (2 min)

1. Changes have been pushed to GitHub: ✅ Done
2. Netlify auto-deploys when you set environment variables
3. You should see a new deploy in Netlify Dashboard

**Status:** ⏳ Waiting - Will auto-deploy after step 2

---

### 4. Test Discord Login (8 min)

Once deployed, test the flow:

1. Visit: https://dussey.dev/wordhex/
2. Click "Sign in with Discord" button
3. You'll be redirected to Discord
4. Click "Authorize" to allow WordHex
5. You'll be redirected back to the game menu
6. Check Supabase to verify user was created:
   - Supabase Dashboard → Table Editor
   - Select `public.users`
   - You should see your Discord account

**Status:** ⏳ Waiting - Will test after step 3

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Discord redirect URL added to application
- [ ] Environment variables set in Netlify (no typos!)
- [ ] Site redeployed successfully
- [ ] Can visit https://dussey.dev/wordhex/ without errors
- [ ] Can click "Sign in with Discord" button
- [ ] Redirected to Discord authorization page
- [ ] Can authorize WordHex
- [ ] Redirected back to game menu after auth
- [ ] User appears in Supabase (public.users table)
- [ ] Avatar and username are correct

---

## 📊 What's Happening Behind the Scenes

When you sign in with Discord:

1. **Frontend** → Redirects to Discord
2. **Discord** → Shows authorization screen
3. **Your browser** → Redirected to `.netlify/functions/discord-auth` with auth code
4. **Netlify Function** →
   - Exchanges code for access token
   - Gets your Discord user data
   - Stores/updates in Supabase
   - Creates session token
5. **Redirect** → Back to game with session
6. **Game** → Now has your Discord profile linked!

---

## 🎯 Next Steps (After OAuth Works)

1. **Track Game Stats** - When game ends, update Supabase
2. **Leaderboard** - Show top players from Supabase
3. **User Profile** - Display personal stats
4. **Multiplayer** - Track games with other players

---

## ❓ Questions During Setup?

**If you get errors:**
1. Check environment variable names exactly match (case-sensitive)
2. Verify no extra spaces in values
3. Check Discord redirect URL has no typos
4. Wait 2-3 minutes after saving env vars before testing
5. Check browser console (F12) for errors

**Ready to proceed?**
1. Add Discord redirect URL to OAuth app
2. Add environment variables to Netlify
3. Test the OAuth flow

Let me know when you've completed these steps! 🎮
