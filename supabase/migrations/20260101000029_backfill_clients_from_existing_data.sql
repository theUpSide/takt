-- Backfill clients and engagements from pre-existing client_name text fields.
-- Idempotent: uses ON CONFLICT / NOT EXISTS so re-running is safe.
--
-- Step 1: create a client per distinct (user_id, client_name) seen in
-- time_entries or charge_accounts. Default status = 'active'.
INSERT INTO clients (user_id, name, relationship_status)
SELECT DISTINCT user_id, trim(client_name), 'active'
FROM (
  SELECT user_id, client_name FROM time_entries
    WHERE client_name IS NOT NULL AND trim(client_name) <> ''
  UNION
  SELECT user_id, client_name FROM charge_accounts
    WHERE client_name IS NOT NULL AND trim(client_name) <> ''
) src
ON CONFLICT (user_id, lower(name)) DO NOTHING;

-- Step 2: create an engagement per charge_account that has a client_name,
-- copying hourly_rate -> billing_rate and the account name -> engagement title.
-- Treat billable accounts as hourly_1099, non-billable as pursuit placeholders.
INSERT INTO engagements (
  user_id, client_id, title, engagement_type, billing_rate, status,
  charge_account_id
)
SELECT
  ca.user_id,
  c.id AS client_id,
  ca.name AS title,
  CASE WHEN ca.billable THEN 'hourly_1099' ELSE 'pursuit' END AS engagement_type,
  ca.hourly_rate AS billing_rate,
  'active' AS status,
  ca.id AS charge_account_id
FROM charge_accounts ca
JOIN clients c
  ON c.user_id = ca.user_id
  AND lower(c.name) = lower(trim(ca.client_name))
WHERE ca.client_name IS NOT NULL
  AND trim(ca.client_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM engagements e WHERE e.charge_account_id = ca.id
  );

-- Step 3: backfill time_entries.engagement_id where a unique engagement
-- can be determined from the user+client_name pair. If the client has
-- multiple engagements we leave engagement_id NULL - user will assign manually.
WITH candidates AS (
  SELECT
    te2.id AS time_entry_id,
    e.id AS engagement_id,
    count(*) OVER (PARTITION BY te2.id) AS match_count
  FROM time_entries te2
  JOIN clients c
    ON c.user_id = te2.user_id
    AND lower(c.name) = lower(trim(te2.client_name))
  JOIN engagements e
    ON e.client_id = c.id
    AND e.user_id = te2.user_id
  WHERE te2.engagement_id IS NULL
    AND te2.client_name IS NOT NULL
    AND trim(te2.client_name) <> ''
)
UPDATE time_entries te
SET engagement_id = candidates.engagement_id
FROM candidates
WHERE te.id = candidates.time_entry_id
  AND candidates.match_count = 1;
