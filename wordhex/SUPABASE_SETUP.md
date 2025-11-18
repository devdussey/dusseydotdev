# WordHex Supabase Setup Guide

## Overview
WordHex is a Discord Activity game that uses Supabase (PostgreSQL) for backend data persistence.

## Prerequisites
- Supabase project created at https://supabase.com
- Environment variables configured

## Environment Variables

Add these to your deployment environment or `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

## Database Schema (To Be Implemented)

The following tables will need to be created in Supabase:

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(4) UNIQUE,
  players UUID[] NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

### Game Results Table
```sql
CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES users(id),
  score INTEGER,
  words_found TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Word Dictionary Table
```sql
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(255) UNIQUE NOT NULL,
  length INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Setup Instructions

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Copy your Project URL and Anon Key

2. **Configure Environment Variables**
   - In Netlify Dashboard: Settings → Build & Deploy → Environment
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`

3. **Create Database Tables**
   - In Supabase Dashboard: SQL Editor
   - Run the SQL scripts above to create tables

4. **Configure Row-Level Security (RLS)**
   - Enable RLS on all tables
   - Create policies as needed for your game rules

5. **Set Up Real-time Subscriptions**
   - Enable Realtime on tables that need live updates
   - Configure in table settings

## Next Steps

- Implement API endpoints for game state management
- Set up Discord OAuth authentication
- Create backend services for game logic validation
- Configure WebSocket connections for real-time multiplayer

## Deployment

Frontend deployed to: https://wordhex.dussey.dev
Backend: To be configured on separate service (Railway/Vercel recommended)
Database: Supabase
