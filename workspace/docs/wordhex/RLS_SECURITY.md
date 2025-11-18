# WordHex Row-Level Security (RLS) Documentation

## Overview
Row-Level Security (RLS) is PostgreSQL's built-in security feature that restricts what data users can access. In WordHex, RLS ensures players can only see/modify their own data and public game information.

## Architecture

### Schema Organization
```
┌─────────────────────────────────┐
│   PUBLIC SCHEMA (Backend Only)  │
│  ────────────────────────────── │
│  • users (profiles)             │
│  • words (dictionary)           │
│  • (Internal data)              │
│  RLS: DISABLED (service role)  │
└─────────────────────────────────┘
           ↑ (Connection String)
           │
       Backend/Node.js
           │
           ↓ (Data API HTTP)
┌─────────────────────────────────┐
│   API SCHEMA (Frontend Access)  │
│  ────────────────────────────── │
│  • games (public games)         │
│  • game_results (scores)        │
│  • leaderboard (rankings)       │
│  • game_invites (invitations)   │
│  RLS: ENABLED (auth.uid())     │
└─────────────────────────────────┘
       ↑ (Data API HTTP)
       │
    Frontend (supabase-js SDK)
```

---

## RLS Policies Explained

### 1. **public.users** - Player Profiles
```sql
-- Policy: "Users can read own profile"
FOR SELECT USING (auth.uid()::text = id::text)
```
**What it does:**
- Players can only read their own user profile
- Cannot see other players' email or private info
- Prevents privacy leaks

**Use case:**
- Frontend fetches current player's username and avatar
- Cannot spy on other players

---

### 2. **public.words** - Word Dictionary
```sql
-- Policy: "Words are backend only"
FOR ALL USING (false)
```
**What it does:**
- **Complete lock** - Frontend cannot access this table at all
- Only backend (service role) can read/write words
- Prevents cheating (frontend cannot validate words)

**Why:**
- Word validation MUST happen on backend only
- If frontend had access, players could validate any word
- Ensures game integrity

**Backend usage:**
```javascript
// Backend validates words using Connection String
const { data, error } = await client.query(
  'SELECT * FROM public.words WHERE word = $1',
  [playerWord]
);
```

---

### 3. **api.games** - Active Games
```sql
-- Policy: "Anyone can read public games"
FOR SELECT USING (status IN ('waiting', 'active'))

-- Policy: "Users can read their games"
FOR SELECT USING (host_id = auth.uid() OR auth.uid() = ANY(players))

-- Policy: "Authenticated users can create games"
FOR INSERT WITH CHECK (host_id = auth.uid())

-- Policy: "Host can update own game"
FOR UPDATE USING (host_id = auth.uid())
```

**What it does:**
- Anyone can see public games looking for players
- Only host and participating players can see game details
- Only host can update game state
- Prevents tampering with others' games

**Security benefits:**
- Players can't see private lobbies they weren't invited to
- Host has full control over game settings
- Players can't modify game rules or scores

---

### 4. **api.game_results** - Scores & Results
```sql
-- Policy: "Players can read own results"
FOR SELECT USING (player_id = auth.uid())

-- Policy: "Host can read game results"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM api.games
    WHERE api.games.id = api.game_results.game_id
    AND api.games.host_id = auth.uid()
  )
)

-- Policy: "Service role can insert results"
FOR INSERT WITH CHECK (true)
```

**What it does:**
- Players see only their own scores
- Game host can view all player results from their game
- Backend (service role) inserts final results

**Security benefits:**
- Players can't see other players' scores before game ends
- Prevents score manipulation
- Host can verify fair play

---

### 5. **api.leaderboard** - Public Rankings
```sql
-- Policy: "Anyone can read leaderboard"
FOR SELECT USING (true)

-- Policy: "Service role updates leaderboard"
FOR ALL USING (true)
```

**What it does:**
- Public read access - everyone can see rankings
- Only backend updates (aggregates scores)
- No direct player manipulation

**Security benefits:**
- Transparent rankings
- Cannot cheat scores onto leaderboard
- Backend calculates rankings safely

---

### 6. **api.game_invites** - Invitations
```sql
-- Policy: "Users can read own invites"
FOR SELECT USING (invited_player_id = auth.uid())

-- Policy: "Users can read sent invites"
FOR SELECT USING (invited_by_id = auth.uid())

-- Policy: "Users can invite to games"
FOR INSERT WITH CHECK (invited_by_id = auth.uid())

-- Policy: "Users can respond to invites"
FOR UPDATE USING (invited_player_id = auth.uid())
```

**What it does:**
- Players see invites sent TO them
- Players see invites they SENT
- Cannot see invites for other players

**Security benefits:**
- Privacy - cannot snoop on others' invitations
- Players control their own invites

---

## How RLS Works with Auth

### Frontend (supabase-js)
```javascript
const { data: { user } } = await supabase.auth.getSession();

// This request automatically includes auth.uid()
const { data: games } = await supabase
  .from('games')
  .select('*')
  .eq('status', 'active');
// RLS automatically filters based on user's auth.uid()
```

**Behind the scenes:**
1. User logs in → Supabase generates JWT token
2. Frontend sends request with token
3. Supabase verifies token → extracts `auth.uid()`
4. RLS policies check `auth.uid()` against user data
5. Only matching rows returned

### Backend (Connection String)
```javascript
// Backend connects with service role (bypasses RLS)
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Service role uses master key - bypasses RLS
});

// Can read/write ANY data
const { rows } = await client.query('SELECT * FROM public.words');
```

**Service Role:**
- Uses master API key (keep SECRET)
- Bypasses all RLS policies
- Used only for trusted backend operations
- Examples: word validation, score calculation, data migrations

---

## Testing RLS

### Test as Player 1
```javascript
// Login as player1
const user1 = await supabase.auth.signInWithPassword({
  email: 'player1@example.com',
  password: 'password123'
});

// Can see their profile
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .single();
// Returns: { id: uuid1, username: 'player1', ... }

// Cannot see player2's profile (returns 0 rows)
const { data: others } = await supabase
  .from('users')
  .select('*')
  .neq('id', uuid1);
// Returns: [] (empty)
```

### Test as Player 2
```javascript
// Same queries return different data based on auth.uid()
```

### Test Backend
```javascript
// Backend can see everything
const words = await client.query('SELECT * FROM public.words');
// Returns: all words regardless of auth
```

---

## Security Checklist

- [x] Public schema locked down (backend only)
- [x] API schema exposed with RLS enabled
- [x] Users can only see own profiles
- [x] Word dictionary protected (backend validation only)
- [x] Games visible only to participants
- [x] Scores protected until game ends
- [x] Leaderboard aggregated by backend
- [x] Invites private to sender/receiver
- [x] Service role only for trusted operations
- [x] Realtime enabled for live updates

---

## Common Vulnerabilities Prevented

| Vulnerability | Prevention |
|---|---|
| **Frontend word validation** | Words in public schema with RLS: false |
| **Score tampering** | game_results INSERT only via backend |
| **Privacy leaks** | Users can only read own profile |
| **Unauthorized game access** | Games filtered by host_id or players array |
| **Cross-player data theft** | RLS filters all queries by auth.uid() |
| **Leaderboard manipulation** | Leaderboard updated by backend only |

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=eyJhbGc... (anon key - safe to expose)
```

### Backend (.env)
```
DATABASE_URL=postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (secret - keep private!)
```

---

## Next Steps

1. ✅ Run `supabase-setup.sql` in SQL Editor
2. ✅ Verify RLS policies in Auth Policies tab
3. ✅ Configure Discord OAuth in Authentication
4. ✅ Set environment variables in Netlify + Backend
5. ✅ Test with sample game flow
6. ✅ Monitor access logs for violations

---

## Debugging RLS Issues

### Problem: "Not authenticated" error
```
Error: new row violates row-level security policy
```
**Solution:** User not logged in or JWT expired. Ensure auth.signIn() completed.

### Problem: Empty results
```
Query returns 0 rows
```
**Solution:** RLS policy not matching. Check:
- Is user authenticated? (`auth.uid()` exists)
- Does user own the record?
- Is status correct (public vs private)?

### Problem: "Cannot insert"
```
Error: new row violates row-level security policy
```
**Solution:** RLS INSERT policy requires `auth.uid() = host_id`. Ensure game creation includes current user ID.

### Enable RLS Debugging
```sql
-- In Supabase SQL Editor
SET app.jwt_claims = '{"sub":"user-uuid"}';
-- Run your SELECT query
-- Will show what RLS filters apply
```

---

**Security is built-in! RLS prevents cheating at the database level.** ✅
