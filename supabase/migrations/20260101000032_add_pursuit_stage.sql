-- Track where each pursuit-type engagement sits in the capture pipeline.
-- Only meaningful for engagement_type = 'pursuit'. For other types the
-- column is ignored.
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS pursuit_stage text
    CHECK (pursuit_stage IN (
      'initial_contact',
      'qualification',
      'proposal',
      'negotiation',
      'decision_pending'
    ));

-- Default existing pursuit rows to the first stage so they show up on the
-- pipeline board instead of floating off it.
UPDATE engagements
  SET pursuit_stage = 'initial_contact'
WHERE engagement_type = 'pursuit'
  AND pursuit_stage IS NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_pursuit_stage
  ON engagements(pursuit_stage)
  WHERE pursuit_stage IS NOT NULL;
