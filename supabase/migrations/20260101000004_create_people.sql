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
