# Discord OAuth2 Settings & Scopes for WordHex

## 🔧 OAuth2 Configuration

### General Tab
Located at: https://discord.com/developers/applications → Your App → OAuth2 → General

**Settings to Configure:**

1. **Client ID** ✅ (Already generated)
   - Value: `1440392506553405580`
   - This is public, safe to share

2. **Client Secret** ✅ (Already generated)
   - Value: `TdeBYPxJ6IUmz74RDIn_whjumZn6I184`
   - Keep this SECRET! Store only in Netlify env vars

3. **Authorization Code Grant**
   - Toggle: **ON** ✅
   - Required for OAuth2 login flow

4. **Implicit Grant**
   - Toggle: **OFF** ❌
   - Not needed for server-side OAuth

5. **Client Credentials Grant**
   - Toggle: **OFF** ❌
   - Not needed for user authentication

---

## 🎯 Scopes (Permissions)

### What You Need

In OAuth2 → URL Generator, select these scopes:

| Scope | What You Get | Why You Need It |
|-------|-------------|-----------------|
| `identify` | ✅ User ID, username, avatar | Required - core user identity |
| `email` | ✅ User email address | Optional but recommended |

**Do NOT select:**
- `connections` - User's connected accounts
- `guilds` - Servers user is in
- `dm_channels` - Private messages
- `rpc` - Rich presence data
- `bot` - Bot permissions (not needed)
- `webhook.incoming` - Webhook access

### Why These Scopes?

```json
{
  "identify": {
    "id": "123456789",           // Discord user ID (unique, use for DB)
    "username": "devdussey",      // Display name
    "avatar": "a_hash123...",     // Avatar image hash
    "avatar_decoration": "...",   // Special avatar badge
    "discriminator": "0",         // Old tag (deprecated)
    "public_flags": 256,          // Special badges (staff, etc)
    "flags": 256,
    "locale": "en-US"            // User's language
  },

  "email": {
    "email": "user@example.com",  // Email address
    "verified": true              // If email is verified
  }
}
```

---

## 📍 Redirect URI (Most Important!)

### Exact Setting

**Location:** OAuth2 → Redirects

**Add this exact URL:**
```
https://dussey.dev/.netlify/functions/discord-auth
```

**Important Notes:**
- ✅ Must be HTTPS (not HTTP)
- ✅ Must match exactly (no trailing slash)
- ✅ Cannot use localhost in production
- ✅ Must match what you put in Netlify env vars

### For Local Development

If you want to test locally, add BOTH:
```
https://dussey.dev/.netlify/functions/discord-auth
http://localhost:8888/.netlify/functions/discord-auth
```

(But only use the first one in production)

---

## 📋 Complete Setup Checklist

In Discord Developer Portal → Your WordHex App:

### OAuth2 → General Tab
- [x] Client ID: `1440392506553405580`
- [x] Client Secret: `TdeBYPxJ6IUmz74RDIn_whjumZn6I184`
- [ ] Authorization Code Grant: **ON**
- [ ] Implicit Grant: **OFF**
- [ ] Client Credentials Grant: **OFF**
- [ ] Refresh Token Rotation: Optional (can leave OFF)
- [ ] Require Code Challenge: Leave OFF

### OAuth2 → Redirects
- [ ] Add Redirect:
  ```
  https://dussey.dev/.netlify/functions/discord-auth
  ```

### OAuth2 → URL Generator
- [ ] Scope: `identify`
- [ ] Scope: `email`
- [ ] Application Permissions: (none needed)

### General Settings
- [ ] Application Name: `WordHex` ✓
- [ ] Description: (optional)
- [ ] Icon: (optional, can add later)

---

## 🔐 What Data You Get

After user authorizes, Discord returns:

```javascript
{
  // From 'identify' scope
  id: "123456789",           // Unique Discord ID
  username: "devdussey",     // Their username
  avatar: "a_abc123def456",  // Avatar hash (use to build image URL)
  discriminator: "0",        // Old tag system (ignore)
  public_flags: 256,         // Special badges
  flags: 256,
  locale: "en-US",           // Language preference

  // From 'email' scope
  email: "user@example.com", // Email address
  verified: true,            // Email verified status

  // Always included
  mfa_enabled: false,        // 2FA enabled
  banner: null,              // Banner color/image
  accent_color: 7289da,      // Accent color
  premium_type: 0            // Nitro status
}
```

---

## 🖼️ Building Avatar URL

Use this to show user's avatar:

```javascript
const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;

// With size:
const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;

// Sizes: 16, 32, 64, 128, 256, 512, 1024
```

Our code already handles this in the Netlify Function ✅

---

## 🚨 Security Considerations

### DO ✅
- Keep Client Secret in Netlify env vars only
- Use HTTPS redirect URLs only
- Store minimal scopes (only what you need)
- Exchange code on backend (Netlify Function does this)
- Validate user data before storing

### DON'T ❌
- Commit Client Secret to Git
- Use HTTP for redirect URLs
- Request scopes you don't need
- Exchange tokens in frontend code
- Trust client-side auth tokens

---

## 🧪 Testing Your OAuth Setup

### Step 1: Generate Authorization URL

Visit this URL (replace with your client ID):

```
https://discord.com/api/oauth2/authorize?client_id=1440392506553405580&redirect_uri=https%3A%2F%2Fdussey.dev%2F.netlify%2Ffunctions%2Fdiscord-auth&response_type=code&scope=identify%20email
```

(This is what the login page does automatically)

### Step 2: Click Authorize

You'll be redirected to your function with a code:
```
https://dussey.dev/.netlify/functions/discord-auth?code=abc123def456&state=xyz
```

### Step 3: Function Processes It

Function should:
1. Exchange code for access token
2. Get user data from Discord API
3. Store user in Supabase
4. Redirect to game with session

### Step 4: Verify

Check Supabase → public.users table for your user

---

## 📊 Scope Comparison

### Minimal (What You Have) 🟢
- Scopes: `identify` `email`
- Gets: ID, username, avatar, email
- Good for: Stats, profiles, leaderboard

### Standard 🟡
- Add: `guilds`
- Gets: Which servers user is in
- Use case: Server-exclusive features

### Full Access 🔴
- Add: `connections` `dm_channels` `bot`
- Gets: Everything
- NOT RECOMMENDED for public games

**You already have the right scopes!** ✅

---

## ✅ Your Current Setup

Based on the code I created, here's what's configured:

**Netlify Function expects:**
```javascript
{
  client_id: "1440392506553405580",
  client_secret: "TdeBYPxJ6IUmz74RDIn_whjumZn6I184",
  redirect_uri: "https://dussey.dev/.netlify/functions/discord-auth",
  scopes: "identify email"  // What login page requests
}
```

**You'll receive:**
```javascript
{
  id,                 // Unique Discord ID
  username,           // Username
  avatar,             // Avatar hash
  email,              // Email
  verified            // Email verified
}
```

**Stored in Supabase:**
```sql
discord_id,           // From: id
discord_username,     // From: username
avatar_url,           // Built from: avatar hash
email                 // From: email
```

---

## 🎯 Quick Setup (Copy/Paste)

### 1. Discord Developer Portal Settings

**OAuth2 → General:**
- Authorization Code Grant: ON
- Implicit Grant: OFF
- Client Credentials Grant: OFF

**OAuth2 → Redirects:**
- Add: `https://dussey.dev/.netlify/functions/discord-auth`

**OAuth2 → URL Generator:**
- Scopes: `identify`, `email`

### 2. Netlify Environment Variables

```
DISCORD_CLIENT_ID = 1440392506553405580
DISCORD_CLIENT_SECRET = TdeBYPxJ6IUmz74RDIn_whjumZn6I184
DISCORD_REDIRECT_URI = https://dussey.dev/.netlify/functions/discord-auth
```

---

## 🔗 Useful Links

- Discord Developer Portal: https://discord.com/developers/applications
- OAuth2 Documentation: https://discord.com/developers/docs/topics/oauth2
- OAuth2 Scopes: https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes

---

**Ready to configure? Everything is set up, just need Discord OAuth2 settings applied!** ✅
