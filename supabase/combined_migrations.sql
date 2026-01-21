-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6B7280',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categories IS 'Task and event categories (swim lanes)';
-- Create calendar_sources table
CREATE TABLE calendar_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ics_url TEXT NOT NULL,
    default_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE calendar_sources IS 'External ICS calendar feeds for syncing events';
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
-- Create dependencies table for task relationships
CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent duplicate dependencies
    CONSTRAINT unique_dependency UNIQUE (predecessor_id, successor_id),

    -- Prevent self-referential dependencies
    CONSTRAINT no_self_dependency CHECK (predecessor_id != successor_id)
);

COMMENT ON TABLE dependencies IS 'Task dependencies - predecessor must complete before successor can start';
COMMENT ON COLUMN dependencies.predecessor_id IS 'Task that must complete first';
COMMENT ON COLUMN dependencies.successor_id IS 'Task that depends on predecessor';
-- Create people table for NLP category mapping
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    default_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE people IS 'Known people for NLP category inference from SMS';
COMMENT ON COLUMN people.aliases IS 'Alternative names/nicknames for matching';
COMMENT ON COLUMN people.default_category_id IS 'Category to assign when this person is mentioned';
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
-- Performance indexes

-- Items indexes
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_due_date ON items(due_date) WHERE type = 'task';
CREATE INDEX idx_items_start_time ON items(start_time);
CREATE INDEX idx_items_external_id ON items(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_items_source ON items(source);
CREATE INDEX idx_items_completed ON items(completed) WHERE type = 'task';
CREATE INDEX idx_items_calendar_source ON items(calendar_source_id) WHERE calendar_source_id IS NOT NULL;

-- Dependencies indexes
CREATE INDEX idx_dependencies_predecessor ON dependencies(predecessor_id);
CREATE INDEX idx_dependencies_successor ON dependencies(successor_id);

-- People full-text search
CREATE INDEX idx_people_name ON people USING gin(to_tsvector('english', name));

-- SMS log
CREATE INDEX idx_sms_log_processed_at ON sms_log(processed_at DESC);
-- Enable Row Level Security on all tables
-- Since this is a single-user application, we allow full access to authenticated users

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Authenticated users have full access to categories"
    ON categories FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Items policies
CREATE POLICY "Authenticated users have full access to items"
    ON items FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Dependencies policies
CREATE POLICY "Authenticated users have full access to dependencies"
    ON dependencies FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Calendar sources policies
CREATE POLICY "Authenticated users have full access to calendar_sources"
    ON calendar_sources FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- People policies
CREATE POLICY "Authenticated users have full access to people"
    ON people FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- SMS log policies
CREATE POLICY "Authenticated users have full access to sms_log"
    ON sms_log FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow service role to bypass RLS for Edge Functions
-- (Service role automatically bypasses RLS in Supabase)
-- Seed default categories
INSERT INTO categories (name, color, sort_order) VALUES
    ('Work', '#3B82F6', 1),
    ('Consulting', '#8B5CF6', 2),
    ('Home', '#10B981', 3),
    ('Kids', '#F59E0B', 4),
    ('Personal', '#EC4899', 5);
