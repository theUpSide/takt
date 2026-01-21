-- Create items table (stores both tasks and events)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('task', 'event')),
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'sms', 'ics')),
    external_id TEXT,
    calendar_source_id UUID REFERENCES calendar_sources(id) ON DELETE CASCADE,
    raw_sms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE items IS 'Tasks and events - the main content of the application';
COMMENT ON COLUMN items.type IS 'Discriminator: task or event';
COMMENT ON COLUMN items.external_id IS 'UID from ICS for deduplication';
COMMENT ON COLUMN items.raw_sms IS 'Original SMS text if source=sms';
