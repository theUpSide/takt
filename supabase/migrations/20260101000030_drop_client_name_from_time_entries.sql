-- Drop the denormalized time_entries.client_name column.
--
-- Source of truth for the client a time entry belongs to is now
--   time_entries.engagement_id -> engagements.client_id -> clients
-- charge_accounts.client_name is intentionally kept for now. It's still used
-- by the charge-account billing profile UI and by the SMS resolution path;
-- removing it is a separate cleanup.
--
-- Safety guard: this migration ABORTS if any time_entries row still has
-- client_name set but no engagement_id. Those are entries the backfill
-- couldn't link unambiguously (typically because the client had multiple
-- engagements). Assign engagements via the Time tab or via SQL before
-- re-running.
DO $$
DECLARE
  orphan_count integer;
  sample_names text;
BEGIN
  SELECT count(*)
    INTO orphan_count
  FROM time_entries
  WHERE client_name IS NOT NULL
    AND trim(client_name) <> ''
    AND engagement_id IS NULL;

  IF orphan_count > 0 THEN
    SELECT string_agg(DISTINCT client_name, ', ')
      INTO sample_names
    FROM (
      SELECT client_name FROM time_entries
      WHERE client_name IS NOT NULL
        AND trim(client_name) <> ''
        AND engagement_id IS NULL
      ORDER BY client_name
      LIMIT 10
    ) s;

    RAISE EXCEPTION
      'Cannot drop time_entries.client_name: % row(s) have client_name set but no engagement_id. Assign an engagement to each before re-running. Client names found: %',
      orphan_count, sample_names;
  END IF;
END $$;

ALTER TABLE time_entries DROP COLUMN client_name;
