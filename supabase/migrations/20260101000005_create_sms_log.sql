-- Create sms_log table for audit trail
CREATE TABLE sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_sid TEXT NOT NULL UNIQUE,
    from_number TEXT NOT NULL,
    body TEXT NOT NULL,
    parsed_result JSONB,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    error TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sms_log IS 'Audit log for SMS processing';
COMMENT ON COLUMN sms_log.twilio_sid IS 'Twilio message SID for idempotency';
COMMENT ON COLUMN sms_log.parsed_result IS 'Claude API response JSON';
