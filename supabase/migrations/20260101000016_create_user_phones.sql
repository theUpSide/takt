-- Create user_phones table for multiple phone numbers per user
CREATE TABLE IF NOT EXISTS user_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  phone text NOT NULL,
  label text DEFAULT 'Personal',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Index for fast phone lookups from SMS webhook
CREATE INDEX IF NOT EXISTS idx_user_phones_phone ON user_phones(phone);
CREATE INDEX IF NOT EXISTS idx_user_phones_user_id ON user_phones(user_id);

-- Enable RLS
ALTER TABLE user_phones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own phone numbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_phones' AND policyname = 'Users can manage own phones'
  ) THEN
    CREATE POLICY "Users can manage own phones"
    ON user_phones
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Migrate existing phone numbers from user_preferences to user_phones
INSERT INTO user_phones (user_id, phone, label)
SELECT user_id, phone, 'Personal'
FROM user_preferences
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (user_id, phone) DO NOTHING;
