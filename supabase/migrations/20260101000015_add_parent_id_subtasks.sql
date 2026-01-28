-- Add parent_id column to items table for subtask support
ALTER TABLE items ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE CASCADE;

-- Create index for faster parent-child lookups
CREATE INDEX idx_items_parent_id ON items(parent_id) WHERE parent_id IS NOT NULL;

-- Prevent task from being its own parent
ALTER TABLE items ADD CONSTRAINT no_self_parent CHECK (parent_id != id);

COMMENT ON COLUMN items.parent_id IS 'Parent task ID for subtasks - enables parent/child task hierarchy';
