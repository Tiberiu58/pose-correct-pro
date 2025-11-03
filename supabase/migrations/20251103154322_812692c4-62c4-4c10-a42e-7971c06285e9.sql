-- Create enum for fitness goals
CREATE TYPE fitness_goal AS ENUM ('muscle_gain', 'fat_loss', 'endurance', 'flexibility', 'general_fitness');

-- Create enum for experience levels
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create enum for subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'pro');

-- Update profiles table with onboarding data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_goal fitness_goal;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level experience_level;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_equipment TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  duration_minutes INTEGER,
  exercises JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts"
  ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
  ON workouts FOR UPDATE
  USING (auth.uid() = user_id);

-- Create workout sessions table
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  sets_completed INTEGER DEFAULT 0,
  reps_completed INTEGER DEFAULT 0,
  form_accuracy_score INTEGER CHECK (form_accuracy_score >= 0 AND form_accuracy_score <= 100),
  feedback JSONB,
  video_url TEXT,
  duration_seconds INTEGER,
  calories_burned INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  requirement_type TEXT,
  requirement_value INTEGER
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Create chat messages table for AI coach
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach messages"
  ON coach_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach messages"
  ON coach_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Insert some default badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('First Workout', 'Complete your first workout session', '🎯', 'sessions', 1),
  ('Week Streak', 'Workout 7 days in a row', '🔥', 'streak', 7),
  ('Form Master', 'Achieve 95% form accuracy', '⭐', 'accuracy', 95),
  ('Century Club', 'Complete 100 workout sessions', '💯', 'sessions', 100),
  ('Early Bird', 'Complete a workout before 7am', '🌅', 'time', 7)
ON CONFLICT (name) DO NOTHING;