/**
 * Stonefire - Supabase DB Initialization / Upgrade Script
 * Safe to run multiple times (idempotent).
 */

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- PROFILES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT DEFAULT '',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (for upgrades)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================
-- SAVE GAMES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.save_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_state JSONB NOT NULL,
    saved_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.save_games
    ADD COLUMN IF NOT EXISTS game_state JSONB,
    ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ DEFAULT NOW();

-- =========================
-- PROGRESS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS public.progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stats JSONB DEFAULT '{
        "games_played": 0,
        "wins": 0,
        "losses": 0,
        "current_streak": 0,
        "best_streak": 0,
        "faction_stats": {},
        "achievement_stats": {
          "total_spells_cast": 0,
          "total_creatures_summoned": 0,
          "total_attacks": 0,
          "total_damage_to_hero": 0,
          "total_damage_to_creatures": 0,
          "total_creatures_killed": 0,
          "turns_played": 0,
          "total_healing": 0,
          "total_cards_played": 0,
          "total_relics_played": 0,
          "total_player_creatures_lost": 0,
          "full_board_turns": 0,
          "enemy_board_clears": 0,
          "enemy_board_clears_single_spell": 0,
          "enemy_board_clears_single_attack": 0,
          "enemy_board_clears_single_effect": 0,
          "wins_without_creature_loss": 0,
          "wins_with_full_board": 0,
          "wins_low_health": 0,
          "max_damage_in_turn": 0,
          "max_heal_in_turn": 0
        }
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.progress
    ADD COLUMN IF NOT EXISTS stats JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================
-- ROW LEVEL SECURITY
-- =========================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- =========================
-- POLICIES (DROP + RECREATE)
-- =========================
-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Save games
DROP POLICY IF EXISTS "Users can view own saves" ON public.save_games;
DROP POLICY IF EXISTS "Users can insert own saves" ON public.save_games;
DROP POLICY IF EXISTS "Users can update own saves" ON public.save_games;
DROP POLICY IF EXISTS "Users can delete own saves" ON public.save_games;

CREATE POLICY "Users can view own saves"
ON public.save_games FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saves"
ON public.save_games FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saves"
ON public.save_games FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saves"
ON public.save_games FOR DELETE
USING (auth.uid() = user_id);

-- Progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.progress;

CREATE POLICY "Users can view own progress"
ON public.progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.progress FOR UPDATE
USING (auth.uid() = user_id);

-- =========================
-- FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''))
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.progress (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- TRIGGERS (SAFE CREATE)
-- =========================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at'
    ) THEN
        CREATE TRIGGER profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'progress_updated_at'
    ) THEN
        CREATE TRIGGER progress_updated_at
        BEFORE UPDATE ON public.progress
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at();
    END IF;
END;
$$;
