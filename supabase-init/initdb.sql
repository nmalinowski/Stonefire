/**
 * Stonefire - Supabase DB Initialization Script
 * This script sets up the necessary tables, policies, and triggers
 * for managing user profiles, save games, and progress tracking.
 */

-- Profiles table
  CREATE TABLE profiles (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      display_name TEXT DEFAULT '',
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Save games table (single-slot per user)
  CREATE TABLE save_games (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
      game_state JSONB NOT NULL,
      saved_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Progress table
  CREATE TABLE progress (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
      stats JSONB DEFAULT '{
          "games_played": 0,
          "wins": 0,
          "losses": 0,
          "current_streak": 0,
          "best_streak": 0,
          "faction_stats": {}
      }',
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Row Level Security
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE save_games ENABLE ROW LEVEL SECURITY;
  ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

  -- Users can only access their own data
  CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can view own saves" ON save_games FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert own saves" ON save_games FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update own saves" ON save_games FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users can delete own saves" ON save_games FOR DELETE USING (auth.uid() = user_id);

  CREATE POLICY "Users can view own progress" ON progress FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users can insert own progress" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users can update own progress" ON progress FOR UPDATE USING (auth.uid() = user_id);

  -- Auto-create profile + progress on signup (including anonymous)
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
      INSERT INTO public.profiles (id, display_name)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
      INSERT INTO public.progress (user_id)
      VALUES (NEW.id);
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- Auto-update updated_at timestamps
  CREATE OR REPLACE FUNCTION update_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER progress_updated_at BEFORE UPDATE ON progress
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();