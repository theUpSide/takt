-- Enable Supabase Realtime for items and dependencies tables
-- This allows the client-side postgres_changes subscriptions to receive
-- INSERT/UPDATE/DELETE events (e.g. when SMS webhook creates tasks)
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE dependencies;
