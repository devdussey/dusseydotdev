# Discord OAuth Troubleshooting Guide

## 🔍 Browser Console Commands

Open DevTools in your browser (F12) and use these commands to debug:

### 1. Check Environment Variables

```javascript
// Check if Supabase URL is set
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Check if Discord Client ID is set
console.log('Discord Client ID:', import.meta.env.VITE_DISCORD_CLIENT_ID);
```

**Expected output:**
```
Supabase URL: https://wrpskqhpykojfhwlumia.supabase.co
Discord Client ID: 1440392506553405580
```

### 2. Check Session Storage

After login attempt:

```javascript
// Check if session token was stored
console.log('Session:', sessionStorage.getItem('user'));

// Check local storage
console.log('All localStorage:', localStorage);

// Check URL params
const params = new URLSearchParams(window.location.search);
console.log('URL params:', Object.fromEntries(params));
```

### 3. Check Network Requests

In DevTools:
1. Open **Network** tab
2. Try to login
3. Look for requests to:
   - `discord.com/oauth2/authorize` (Discord redirect)
   - `.netlify/functions/discord-auth` (OAuth callback)
   - `wrpskqhpykojfhwlumia.supabase.co` (Database)

**Click each request and check:**
- **Status**: Should be 200 or 302 (redirect)
- **Response**: What error message?
- **Headers**: Authorization headers present?

### 4. Check Discord Authorization

Before clicking login:

```javascript
// Generate Discord OAuth URL manually
const CLIENT_ID = '1440392506553405580';
const REDIRECT_URI = 'https://dussey.dev/.netlify/functions/discord-auth';
const scopes = 'identify+email';

const discordUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}`;

console.log('Discord OAuth URL:', discordUrl);
// Copy and paste in browser to test
```

### 5. Check Fetch Errors

Add to login.html temporarily to see fetch errors:

```javascript
// In browser console
fetch('https://discord.com/api/v10/users/@me', {
  headers: { Authorization: 'Bearer INVALID_TOKEN' }
})
.then(r => r.json())
.then(data => console.log('Discord response:', data))
.catch(err => console.error('Fetch error:', err));
```

---

## 🔧 Netlify Function Logs

### View Function Logs

1. Go to: **https://app.netlify.com/sites/dusseydotdev**
2. Click **Functions** (left sidebar)
3. Click **discord-auth**
4. See **recent invocations** and **logs**

### What to Look For

```
✅ Success:
- "Token exchange successful"
- "User created/updated"
- "Session token created"

❌ Errors:
- "Discord token exchange failed"
- "Failed to get Discord user"
- "Database operation error"
- "ECONNREFUSED" (connection refused)
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Missing authorization code"
**Cause:** Discord didn't send auth code back
**Fix:** Check redirect URL in Discord app exactly matches:
```
https://dussey.dev/.netlify/functions/discord-auth
```

### Issue 2: "Token exchange failed"
**Cause:** Client ID or Secret wrong
**Fix:** Verify in Netlify env vars:
- `DISCORD_CLIENT_ID` = 1440392506553405580
- `DISCORD_CLIENT_SECRET` = [correct secret]

### Issue 3: "Failed to get Discord user"
**Cause:** Access token invalid or expired
**Fix:** Check Discord API response in Netlify logs

### Issue 4: "Database error"
**Cause:** Supabase connection or insert failed
**Fix:**
- Verify `VITE_SUPABASE_URL` is set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check public.users table exists

### Issue 5: "ECONNREFUSED 127.0.0.1:5432"
**Cause:** DATABASE_URL was pointing to localhost
**Fix:** ✅ FIXED - now using Supabase client

---

## 📊 Test the Full Flow

### Step 1: Verify Discord App Config
```
https://discord.com/developers/applications/1440392506553405580
```
Check:
- [x] Client ID visible
- [x] Redirect URL in OAuth2 → Redirects
- [x] Scopes: identify, email

### Step 2: Test OAuth URL Manually
1. Open browser console
2. Run the Discord URL generator above
3. Copy the URL
4. Paste in new tab
5. Should redirect to Discord authorization

### Step 3: Check Netlify Logs
1. Try to login
2. Check Netlify function logs for errors
3. Look for specific error messages
4. Copy error details

### Step 4: Verify Supabase
1. Login manually to Supabase
2. Go to Table Editor
3. Select `public.users`
4. Check if new user was created

---

## 🔍 Debug Checklist

- [ ] Discord redirect URL matches exactly
- [ ] DISCORD_CLIENT_ID in Netlify env vars
- [ ] DISCORD_CLIENT_SECRET in Netlify env vars
- [ ] DISCORD_REDIRECT_URI in Netlify env vars
- [ ] VITE_SUPABASE_URL in Netlify env vars
- [ ] SUPABASE_SERVICE_ROLE_KEY in Netlify env vars
- [ ] public.users table exists in Supabase
- [ ] Table has correct columns (discord_id, discord_username, avatar_url, email)
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows 302 redirect from discord-auth function
- [ ] Netlify logs show successful database insert

---

## 📝 Collect Info Before Asking for Help

If something doesn't work:

1. **Browser Console Error:**
   ```
   [Screenshot of error message]
   ```

2. **Network Tab:**
   - What requests were made?
   - What were their responses?

3. **Netlify Function Log:**
   - What's the exact error message?
   - Is DATABASE_URL mentioned?

4. **Supabase Table:**
   - Is the user created?
   - What values are in the columns?

---

## ✅ Success Indicators

When everything is working:

1. ✅ Click login → Redirected to Discord
2. ✅ Click authorize → Redirected back to game
3. ✅ No error message shown
4. ✅ User appears in Supabase `public.users`
5. ✅ Browser console has no errors
6. ✅ Netlify logs show successful operations

---

## 🚀 Quick Test

1. Open https://dussey.dev/wordhex/login.html
2. Open DevTools (F12)
3. Click "SIGN IN WITH DISCORD"
4. Check browser console for errors
5. Check Netlify function logs for details
6. Let me know what you see!
