-- Ensure user_preferences table exists (may have been skipped)
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  phone text,
  timezone text DEFAULT 'America/New_York',
  daily_briefing_enabled boolean DEFAULT false,
  daily_briefing_time time DEFAULT '08:00',
  eod_review_enabled boolean DEFAULT false,
  eod_review_time time DEFAULT '18:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for querying enabled briefings
CREATE INDEX IF NOT EXISTS idx_user_preferences_briefing
ON user_preferences(daily_briefing_enabled)
WHERE daily_briefing_enabled = true;

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write their own preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'Users can manage own preferences'
  ) THEN
    CREATE POLICY "Users can manage own preferences"
    ON user_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Ensure items table has the additional columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS recurring_pattern jsonb;
ALTER TABLE items ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE items ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;
