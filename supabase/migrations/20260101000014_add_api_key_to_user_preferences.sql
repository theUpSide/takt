-- Add api_key column to user_preferences for persistent API key storage
-- This allows users to have their Claude API key tied to their account
-- and accessible across devices/browsers

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS api_key text;

-- Add a comment explaining the column
COMMENT ON COLUMN user_preferences.api_key IS 'User''s Anthropic Claude API key, stored securely per-user';
