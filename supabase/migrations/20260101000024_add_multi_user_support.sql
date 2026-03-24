-- Add multi-user support: add user_id to all tables that don't have it yet
-- Tables already scoped: projects, time_entries, expenses, charge_accounts, user_preferences, user_phones

-- ============================================================
-- 1. Add user_id columns
-- ============================================================

-- Items
ALTER TABLE items
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Categories (also need to change UNIQUE constraint from global to per-user)
ALTER TABLE categories
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Dependencies (scope via user_id for efficient RLS without joins)
ALTER TABLE dependencies
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Calendar Sources
ALTER TABLE calendar_sources
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- People
ALTER TABLE people
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- SMS Log
ALTER TABLE sms_log
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 2. Backfill existing data with the first authenticated user
--    (safe for single-user → multi-user migration)
-- ============================================================
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Try to get an existing user from tables that already have user_id
  SELECT user_id INTO first_user_id FROM projects LIMIT 1;
  IF first_user_id IS NULL THEN
    SELECT user_id INTO first_user_id FROM time_entries LIMIT 1;
  END IF;
  IF first_user_id IS NULL THEN
    SELECT user_id INTO first_user_id FROM expenses LIMIT 1;
  END IF;
  IF first_user_id IS NULL THEN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  END IF;

  -- Only backfill if there's a user to assign to
  IF first_user_id IS NOT NULL THEN
    UPDATE items SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE categories SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE dependencies SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE calendar_sources SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE people SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE sms_log SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- 3. Set NOT NULL and defaults after backfill
-- ============================================================
ALTER TABLE items
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE categories
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE dependencies
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE calendar_sources
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE people
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE sms_log
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================================
-- 4. Update UNIQUE constraints for per-user scoping
-- ============================================================

-- Categories: name must be unique per user (not globally)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_user_name_unique UNIQUE (user_id, name);

-- ============================================================
-- 5. Add indexes for user_id lookups
-- ============================================================
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_dependencies_user_id ON dependencies(user_id);
CREATE INDEX idx_calendar_sources_user_id ON calendar_sources(user_id);
CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_sms_log_user_id ON sms_log(user_id);

-- ============================================================
-- 6. Drop old RLS policies and create user-scoped ones
-- ============================================================

-- Items
DROP POLICY IF EXISTS "Authenticated users have full access to items" ON items;
CREATE POLICY "Users can manage their own items"
  ON items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Categories
DROP POLICY IF EXISTS "Authenticated users have full access to categories" ON categories;
CREATE POLICY "Users can manage their own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Dependencies
DROP POLICY IF EXISTS "Authenticated users have full access to dependencies" ON dependencies;
CREATE POLICY "Users can manage their own dependencies"
  ON dependencies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Calendar Sources
DROP POLICY IF EXISTS "Authenticated users have full access to calendar_sources" ON calendar_sources;
CREATE POLICY "Users can manage their own calendar_sources"
  ON calendar_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- People
DROP POLICY IF EXISTS "Authenticated users have full access to people" ON people;
CREATE POLICY "Users can manage their own people"
  ON people FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SMS Log
DROP POLICY IF EXISTS "Authenticated users have full access to sms_log" ON sms_log;
CREATE POLICY "Users can manage their own sms_log"
  ON sms_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
