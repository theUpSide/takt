-- Add items_created column to track multi-item SMS parsing
ALTER TABLE sms_log ADD COLUMN IF NOT EXISTS items_created INTEGER DEFAULT 0;

-- Make twilio_sid nullable (may be null in error cases)
ALTER TABLE sms_log ALTER COLUMN twilio_sid DROP NOT NULL;

-- Drop unique constraint on twilio_sid to allow null values
ALTER TABLE sms_log DROP CONSTRAINT IF EXISTS sms_log_twilio_sid_key;

-- Add partial unique index (only enforces uniqueness for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS sms_log_twilio_sid_unique
ON sms_log (twilio_sid)
WHERE twilio_sid IS NOT NULL;

COMMENT ON COLUMN sms_log.items_created IS 'Number of items successfully created from this SMS';
