# Discord OAuth Setup Guide

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application**
3. Name: `WordHex`
4. Click Create

## Step 2: Get OAuth Credentials

1. In your app → **OAuth2** → **General**
2. Copy and save these:
   - **Client ID** - (you'll need this)
   - **Client Secret** - (KEEP SECRET! Don't share)

Example format:
```
Client ID: 1234567890123456789
Client Secret: abcdefghijklmnopqrstuvwxyz1234567890
```

## Step 3: Add Redirect URL

1. In **OAuth2** → **Redirects**
2. Click **Add Redirect**
3. Enter:
   ```
   https://dussey.dev/.netlify/functions/discord-auth
   ```
4. Save changes

## Step 4: Get Scopes

In **OAuth2** → **URL Generator**:
- Select scopes: `identify` + `email`
- This gives you: user ID, username, avatar, email

## What You'll Get

After OAuth, you'll receive:
```json
{
  "id": "discord_user_id",
  "username": "username",
  "avatar": "avatar_hash",
  "email": "user@email.com"
}
```

---

## ⚠️ IMPORTANT: Keep Secret Safe!

**Never commit your Client Secret to Git!**

We'll store it in Netlify Environment Variables:
- Dashboard → Settings → Build & Deploy → Environment
- Add variable: `DISCORD_CLIENT_SECRET`
- Netlify keeps it private

---

## Next Steps

1. Get your Client ID and Client Secret
2. Add redirect URL to Discord app
3. Provide the credentials so I can set up the code

**Send me:**
- Client ID
- Client Secret
- Confirm redirect URL is set
