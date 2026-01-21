-- Enable Row Level Security on all tables
-- Since this is a single-user application, we allow full access to authenticated users

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Authenticated users have full access to categories"
    ON categories FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Items policies
CREATE POLICY "Authenticated users have full access to items"
    ON items FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Dependencies policies
CREATE POLICY "Authenticated users have full access to dependencies"
    ON dependencies FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Calendar sources policies
CREATE POLICY "Authenticated users have full access to calendar_sources"
    ON calendar_sources FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- People policies
CREATE POLICY "Authenticated users have full access to people"
    ON people FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- SMS log policies
CREATE POLICY "Authenticated users have full access to sms_log"
    ON sms_log FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow service role to bypass RLS for Edge Functions
-- (Service role automatically bypasses RLS in Supabase)
