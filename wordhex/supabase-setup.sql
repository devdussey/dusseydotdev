-- ========================================
-- WordHex Supabase Setup Script
-- ========================================
-- This script sets up the complete database schema for WordHex
-- with proper security via schemas and Row-Level Security (RLS)
--
-- SETUP INSTRUCTIONS:
-- 1. In Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
-- 4. Verify all tables created in Table Editor
-- ========================================

-- ========================================
-- 1. CREATE SCHEMAS
-- ========================================

-- Public schema (already exists, used for backend only)
-- Private schema for internal data
CREATE SCHEMA IF NOT EXISTS private;

-- API schema for frontend Data API exposure
CREATE SCHEMA IF NOT EXISTS api;

-- ========================================
-- 2. PUBLIC SCHEMA - BACKEND ONLY TABLES
-- ========================================

-- Users table (private - backend only)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Word dictionary (private - backend only, large table)
CREATE TABLE IF NOT EXISTS public.words (
  id BIGSERIAL PRIMARY KEY,
  word VARCHAR(255) UNIQUE NOT NULL,
  length INTEGER NOT NULL,
  difficulty VARCHAR(50), -- easy, medium, hard, expert
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for word lookups
CREATE INDEX IF NOT EXISTS idx_words_word ON public.words(word);
CREATE INDEX IF NOT EXISTS idx_words_length ON public.words(length);

-- ========================================
-- 3. API SCHEMA - FRONTEND DATA API TABLES
-- ========================================

-- Games table (exposed to frontend)
CREATE TABLE IF NOT EXISTS api.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(4) UNIQUE, -- 4-digit code for private lobbies
  host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  players UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  player_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 6,
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, active, ended
  game_mode VARCHAR(50) DEFAULT 'multiplayer', -- practice, multiplayer
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  round_duration_seconds INTEGER DEFAULT 30,
  grid TEXT, -- JSON string of 5x5 grid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Game results table (exposed to frontend - scores only)
CREATE TABLE IF NOT EXISTS api.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES api.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  final_score INTEGER DEFAULT 0,
  round_scores INTEGER[] DEFAULT ARRAY[]::integer[], -- scores per round
  words_found TEXT[] DEFAULT ARRAY[]::text[], -- validated words
  gems_earned INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2), -- percentage of valid words
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Leaderboard view (read-only, aggregated data)
CREATE TABLE IF NOT EXISTS api.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  total_games_played INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  average_score DECIMAL(8,2) DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game invites (for friend/lobby joins)
CREATE TABLE IF NOT EXISTS api.game_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES api.games(id) ON DELETE CASCADE,
  invited_player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_by_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(game_id, invited_player_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON api.games(status);
CREATE INDEX IF NOT EXISTS idx_games_host ON api.games(host_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game ON api.game_results(game_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player ON api.game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON api.leaderboard(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_invites_player ON api.game_invites(invited_player_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON api.game_invites(status);

-- ========================================
-- 4. ENABLE ROW-LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.game_invites ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. ROW-LEVEL SECURITY POLICIES
-- ========================================

-- ========== PUBLIC.USERS POLICIES ==========
-- Only authenticated users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Only users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Users cannot delete their own profile (backend only)
CREATE POLICY "Users cannot delete own profile" ON public.users
  FOR DELETE
  USING (false);

-- ========== PUBLIC.WORDS POLICIES ==========
-- No one can read/write directly (backend only)
CREATE POLICY "Words are backend only" ON public.words
  FOR ALL
  USING (false);

-- ========== API.GAMES POLICIES ==========

-- Anyone can read active/public games
CREATE POLICY "Anyone can read public games" ON api.games
  FOR SELECT
  USING (status IN ('waiting', 'active'));

-- Game host can read their own games
CREATE POLICY "Users can read their games" ON api.games
  FOR SELECT
  USING (host_id = auth.uid() OR auth.uid() = ANY(players));

-- Only host can create games
CREATE POLICY "Authenticated users can create games" ON api.games
  FOR INSERT
  WITH CHECK (host_id = auth.uid());

-- Only host can update their game
CREATE POLICY "Host can update own game" ON api.games
  FOR UPDATE
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Only host can delete their game
CREATE POLICY "Host can delete own game" ON api.games
  FOR DELETE
  USING (host_id = auth.uid());

-- ========== API.GAME_RESULTS POLICIES ==========

-- Players can read their own results
CREATE POLICY "Players can read own results" ON api.game_results
  FOR SELECT
  USING (player_id = auth.uid());

-- Host can read results from their games
CREATE POLICY "Host can read game results" ON api.game_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api.games
      WHERE api.games.id = api.game_results.game_id
      AND api.games.host_id = auth.uid()
    )
  );

-- Backend can insert results (service role)
CREATE POLICY "Service role can insert results" ON api.game_results
  FOR INSERT
  WITH CHECK (true);

-- ========== API.LEADERBOARD POLICIES ==========

-- Anyone can read leaderboard (public scores)
CREATE POLICY "Anyone can read leaderboard" ON api.leaderboard
  FOR SELECT
  USING (true);

-- Backend only can update leaderboard (service role)
CREATE POLICY "Service role updates leaderboard" ON api.leaderboard
  FOR ALL
  USING (true);

-- ========== API.GAME_INVITES POLICIES ==========

-- Users can read invites sent to them
CREATE POLICY "Users can read own invites" ON api.game_invites
  FOR SELECT
  USING (invited_player_id = auth.uid());

-- Users can read invites they sent
CREATE POLICY "Users can read sent invites" ON api.game_invites
  FOR SELECT
  USING (invited_by_id = auth.uid());

-- Authenticated users can create invites
CREATE POLICY "Users can invite to games" ON api.game_invites
  FOR INSERT
  WITH CHECK (invited_by_id = auth.uid());

-- Users can respond to their invites
CREATE POLICY "Users can respond to invites" ON api.game_invites
  FOR UPDATE
  USING (invited_player_id = auth.uid())
  WITH CHECK (invited_player_id = auth.uid());

-- ========================================
-- 6. REALTIME SUBSCRIPTIONS
-- ========================================
-- Enable realtime on tables needed for live updates

-- Games table - for active game updates
ALTER PUBLICATION supabase_realtime ADD TABLE api.games;

-- Game results - for score updates
ALTER PUBLICATION supabase_realtime ADD TABLE api.game_results;

-- Game invites - for invitation notifications
ALTER PUBLICATION supabase_realtime ADD TABLE api.game_invites;

-- ========================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ========================================

-- Create a test user (replace discord_id with your actual ID)
-- INSERT INTO public.users (discord_id, discord_username, email)
-- VALUES ('123456789', 'testuser', 'test@example.com');

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- Next steps:
-- 1. Verify all tables exist in Supabase Table Editor
-- 2. Configure environment variables in Netlify
-- 3. Set up Discord OAuth in Supabase Auth
-- 4. Run backend migrations for seed data
-- ========================================
