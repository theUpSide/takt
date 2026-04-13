-- Link engagements to existing time_entries and items tables.
-- Nullable FKs so existing rows remain valid; backfill runs separately.
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagements(id) ON DELETE SET NULL;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES engagements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_engagement_id
  ON time_entries(engagement_id) WHERE engagement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_engagement_id
  ON items(engagement_id) WHERE engagement_id IS NOT NULL;
