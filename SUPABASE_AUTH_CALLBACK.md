# Supabase Auth Callback URL Explained

## 🎯 What Is It?

```
https://wrpskqhpykojfhwlumia.supabase.co/auth/v1/callback
```

This is **Supabase's built-in OAuth callback handler**.

It's used when you:
1. Use Supabase's native authentication (email, phone, OAuth)
2. Want Supabase to handle the OAuth redirect automatically
3. Don't need custom backend processing

---

## 📍 Where Does It Go?

### For Discord OAuth with Supabase Auth

If you were using **Supabase's Auth service** (instead of Netlify Functions):

```
Discord OAuth Flow:
1. User clicks "Sign in with Discord"
2. Redirected to Discord
3. User authorizes
4. Discord redirects to: https://wrpskqhpykojfhwlumia.supabase.co/auth/v1/callback
5. Supabase handles the token exchange
6. Supabase creates user in auth.users
7. Redirect to your app
```

---

## ✅ What You're Currently Using (Better Approach)

You're using **Netlify Functions** instead, which is better for your use case:

```
Your Setup:
1. User clicks "Sign in with Discord"
2. Redirected to Discord
3. User authorizes
4. Discord redirects to: https://dussey.dev/.netlify/functions/discord-auth
5. Your Function handles token exchange
6. Your Function stores user in Supabase database
7. Redirect to your app
```

**Why this is better:**
- ✅ More control over user creation
- ✅ Can customize what data you store
- ✅ Can create custom logic (stats, leaderboard)
- ✅ Simpler setup for Discord Activity

---

## 🔧 When You'd Use `/auth/v1/callback`

### Scenario: Supabase-Only Auth

If you wanted Supabase to handle Discord OAuth:

**In Supabase Dashboard:**
1. Go to **Authentication** → **Providers**
2. Enable **Discord**
3. Add Discord Client ID & Secret
4. Redirect URL: `https://wrpskqhpykojfhwlumia.supabase.co/auth/v1/callback`

**In your app:**
```javascript
// Supabase handles everything
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'discord',
  options: { redirect_to: 'https://dussey.dev/wordhex/' }
});
```

**Then Discord redirects to:**
```
https://wrpskqhpykojfhwlumia.supabase.co/auth/v1/callback?code=xxx
```

Supabase automatically:
- Exchanges code for tokens
- Creates user in `auth.users`
- Redirects to your app

---

## 🚀 Your Current Setup (Recommended)

You're NOT using `/auth/v1/callback` because:

1. **You use Netlify Functions** for OAuth
2. **Custom database** (public.users table)
3. **Full control** over user creation
4. **Better for stats & leaderboard**

Your redirect URL is:
```
https://dussey.dev/.netlify/functions/discord-auth
```

Not Supabase's callback.

---

## 📊 Comparison

| Aspect | Supabase Auth | Your Setup (Netlify) |
|--------|---------------|----------------------|
| OAuth Handler | Supabase | Your Function |
| User Storage | auth.users (Supabase) | public.users (your DB) |
| Control | Limited | Full |
| Stats Tracking | Manual setup | Built-in |
| Leaderboard | Manual query | Easy to implement |
| Custom Logic | Hard | Easy |

**Your approach is better for a game!** ✅

---

## ❓ Do You Need to Add the Callback URL Anywhere?

**No!** Unless you use Supabase's built-in auth:

- ✅ Using Netlify Functions? **Don't add it** (you're using your own callback)
- ✅ Using Supabase Auth? **Add it** to Discord OAuth settings

You're using Netlify Functions, so you only need:
```
https://dussey.dev/.netlify/functions/discord-auth
```

---

## 🎯 Summary

```
https://wrpskqhpykojfhwlumia.supabase.co/auth/v1/callback

= Supabase's auto-OAuth handler
= Only needed if using Supabase Authentication
= You're NOT using it (using Netlify Functions instead)
= Your callback is: https://dussey.dev/.netlify/functions/discord-auth
```

**You're all set!** No need to use Supabase's callback URL. ✅

---

## 📚 Reference

**Supabase Callback URL** (if you ever need it):
- Documentation: https://supabase.com/docs/guides/auth
- Format: `https://[PROJECT_ID].supabase.co/auth/v1/callback`
- Used for: Supabase's built-in OAuth providers

**Your OAuth URL** (what you're using):
- Format: `https://dussey.dev/.netlify/functions/discord-auth`
- Handled by: Netlify Function (your custom code)
- Better for: Custom user creation and stats tracking
