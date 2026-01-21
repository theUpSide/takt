-- Add daily planner scheduling fields to items table
ALTER TABLE items
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_start TIME,
ADD COLUMN duration_minutes INTEGER DEFAULT 30;

-- Add index for efficient date-based queries in the planner
CREATE INDEX idx_items_scheduled_date ON items(scheduled_date) WHERE scheduled_date IS NOT NULL;

COMMENT ON COLUMN items.scheduled_date IS 'Date when task is scheduled in daily planner (YYYY-MM-DD)';
COMMENT ON COLUMN items.scheduled_start IS 'Start time in daily planner (HH:MM)';
COMMENT ON COLUMN items.duration_minutes IS 'Estimated duration in minutes (default 30)';
