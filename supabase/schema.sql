-- ============================================================
-- Foulée - Schéma Supabase complet
-- ============================================================

-- TABLE: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  coach_style TEXT NOT NULL CHECK (coach_style IN ('warm', 'direct', 'technical', 'playful')),
  weight_kg NUMERIC,
  age INTEGER,
  runner_level TEXT CHECK (runner_level IN ('beginner', 'intermediate', 'experienced')),
  weekly_sessions INTEGER,
  best_recent_time TEXT,
  availability TEXT[] DEFAULT '{}',
  injury_history TEXT,
  goal_time TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = user_id);

-- Vue groupe : lecture du prénom de tous les profils
CREATE POLICY "Users can read all first names"
  ON profiles FOR SELECT
  USING (true);

-- TABLE: training_logs
CREATE TABLE IF NOT EXISTS training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  distance_km NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  pace_per_km TEXT,
  feeling INTEGER CHECK (feeling BETWEEN 1 AND 5),
  pain_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own logs"
  ON training_logs FOR ALL
  USING (auth.uid() = user_id);

-- TABLE: weekly_checkins
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  sessions_count INTEGER,
  total_distance_km NUMERIC,
  feeling_score INTEGER CHECK (feeling_score BETWEEN 1 AND 5),
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 2),
  pain_notes TEXT,
  free_word TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own checkins"
  ON weekly_checkins FOR ALL
  USING (auth.uid() = user_id);

-- TABLE: weekly_reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_number INTEGER NOT NULL,
  coach_analysis TEXT NOT NULL,
  email_body TEXT NOT NULL DEFAULT '',
  stats JSONB,
  next_week_program JSONB,
  coach_tips JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent_at TIMESTAMPTZ,
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reports"
  ON weekly_reports FOR ALL
  USING (auth.uid() = user_id);

-- TABLE: training_programs
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_number INTEGER NOT NULL,
  sessions JSONB NOT NULL DEFAULT '[]',
  total_volume_km NUMERIC,
  focus TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own programs"
  ON training_programs FOR ALL
  USING (auth.uid() = user_id);

-- TABLE: coach_conversations
CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
  ON coach_conversations FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: get_group_stats (vue groupe - données publiques)
-- ============================================================
CREATE OR REPLACE FUNCTION get_group_stats()
RETURNS TABLE (
  first_name TEXT,
  sessions_this_week BIGINT,
  km_this_week NUMERIC,
  avg_pace_raw DOUBLE PRECISION
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.first_name,
    COUNT(tl.id) AS sessions_this_week,
    COALESCE(SUM(tl.distance_km), 0) AS km_this_week,
    AVG(
      CASE WHEN tl.distance_km > 0
        THEN tl.distance_km::DOUBLE PRECISION / NULLIF(tl.duration_minutes, 0)
      END
    ) AS avg_pace_raw
  FROM profiles p
  LEFT JOIN training_logs tl ON (
    tl.user_id = p.user_id
    AND tl.date >= date_trunc('week', CURRENT_DATE)::DATE
    AND tl.date < (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::DATE
  )
  WHERE p.onboarding_completed = TRUE
  GROUP BY p.user_id, p.first_name
  ORDER BY km_this_week DESC;
$$;
