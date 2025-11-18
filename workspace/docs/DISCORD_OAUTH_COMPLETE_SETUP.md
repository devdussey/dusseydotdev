# Discord OAuth + Netlify Functions Complete Setup

## 🎯 What This Does

Players can:
1. ✅ Click "Sign in with Discord" button
2. ✅ Authorize WordHex in Discord
3. ✅ User data stored in Supabase automatically
4. ✅ Stats tied to their Discord account
5. ✅ Leaderboard shows Discord usernames and avatars

## 📋 Setup Steps (15 minutes)

### Step 1: Create Discord OAuth Application (5 min)

1. Go to **Discord Developer Portal**: https://discord.com/developers/applications
2. Click **New Application** → Name: `WordHex`
3. Go to **OAuth2** → **General**
4. Copy these (save them):
   - **Client ID** (example: 1234567890123456789)
   - **Client Secret** (example: abc_defGhIjKlMnOpQrStUvWxYz)

5. Scroll to **Redirects** → Click **Add Redirect**
6. Enter:
   ```
   https://dussey.dev/.netlify/functions/discord-auth
   ```
7. Save changes

### Step 2: Add Environment Variables to Netlify (5 min)

1. Go to **Netlify Dashboard** → Your site (dussey.dev)
2. **Settings** → **Build & Deploy** → **Environment**
3. Click **Edit variables** and add:

   ```
   DISCORD_CLIENT_ID = [paste your Client ID]
   DISCORD_CLIENT_SECRET = [paste your Client Secret]
   DISCORD_REDIRECT_URI = https://dussey.dev/.netlify/functions/discord-auth
   ```

4. Also add Supabase credentials (if not already set):
   ```
   VITE_SUPABASE_URL = https://wrpskqhpykojfhwlumia.supabase.co
   VITE_SUPABASE_KEY = [your anon key]
   SUPABASE_SERVICE_ROLE_KEY = [your service role key]
   ```

5. Click **Save**

### Step 3: Update Menu Links (2 min)

Update `/wordhex/index.html` to add login link:

```html
<a href="/wordhex/login.html" class="menu-button primary">
  Sign In with Discord
  <div class="button-desc">Link your stats</div>
</a>
```

### Step 4: Deploy & Test (3 min)

1. Push changes to GitHub:
   ```bash
   git add -A
   git commit -m "Add Discord OAuth integration"
   git push
   ```

2. Netlify auto-deploys
3. Visit: https://dussey.dev/wordhex/login.html
4. Click "Sign In with Discord"
5. You should be redirected back to the game menu

---

## 🔐 How It Works

```
User clicks "Sign In with Discord"
        ↓
Redirects to Discord OAuth page
        ↓
User authorizes WordHex
        ↓
Discord sends code to: .netlify/functions/discord-auth
        ↓
Function exchanges code for user data
        ↓
Function stores user in Supabase (public.users)
        ↓
Function creates session token
        ↓
Redirects back to /wordhex/ with session
        ↓
Game board loads, user authenticated!
```

## 📊 Supabase Users Table

After login, users are stored with:
```sql
- discord_id (unique identifier)
- discord_username (their Discord username)
- avatar_url (their Discord avatar)
- email (optional)
- total_games_played (starts at 0)
- total_score (starts at 0)
- games_won (starts at 0)
- highest_score (starts at 0)
```

## 🎮 Next: Track Game Stats

When a game ends, update Supabase:

```javascript
// After game finishes
const { data, error } = await supabase
  .from('users')
  .update({
    total_games_played: user.total_games_played + 1,
    total_score: user.total_score + gameScore,
    games_won: user.games_won + (won ? 1 : 0),
    highest_score: Math.max(user.highest_score, gameScore)
  })
  .eq('discord_id', user.discord_id);
```

## 🏆 Leaderboard (Future)

Query Supabase to show:

```javascript
const { data: leaderboard } = await supabase
  .from('users')
  .select('discord_username, avatar_url, total_score, games_won, highest_score')
  .order('total_score', { ascending: false })
  .limit(100);
```

## ❌ Troubleshooting

**"Client ID not configured" error**
- Check Netlify environment variables are set
- Make sure `DISCORD_CLIENT_ID` is correct
- Redeploy site after adding variables

**"Invalid redirect URI" error**
- Verify Discord app has correct redirect URL
- Should be exactly: `https://dussey.dev/.netlify/functions/discord-auth`
- Check for typos

**"Database error" when creating user**
- Verify Supabase credentials in Netlify env vars
- Check `public.users` table exists
- Verify RLS policies allow service role access

**User created but session not working**
- Check browser console for errors
- Verify session token is being set
- Check that game board is reading the session

## 📝 Files Created

- `wordhex/login.html` - Discord OAuth login page
- `netlify/functions/discord-auth.js` - OAuth handler
- `netlify/functions/package.json` - Dependencies
- `DISCORD_OAUTH_SETUP.md` - Initial setup guide

## 🚀 Testing Checklist

- [ ] Discord application created with Client ID & Secret
- [ ] Redirect URI added to Discord app
- [ ] Environment variables added to Netlify
- [ ] Site redeployed
- [ ] Can access https://dussey.dev/wordhex/login.html
- [ ] Can click "Sign In with Discord" without errors
- [ ] Redirected to Discord authorization page
- [ ] After authorization, redirected back to game
- [ ] User appears in Supabase (public.users table)
- [ ] Can play game and stats are tracked

## 🎯 What's Next

1. **Game Stats Integration** - Update Supabase when game ends
2. **Leaderboard Page** - Show top players from Supabase
3. **User Profile** - Display player stats and rank
4. **Multiplayer** - Track games between multiple players
5. **Achievements** - Unlock badges/achievements

---

**Ready to set up? Provide your Discord Client ID and Secret, and I'll integrate everything!** 🎮
