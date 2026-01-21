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
