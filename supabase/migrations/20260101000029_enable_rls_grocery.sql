-- Grocery Cart Automation: RLS policies (SDD §10.3)
-- Mirror the per-user pattern established in migration 0024.

ALTER TABLE product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kroger_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own product_mappings"
    ON product_mappings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own kroger_oauth_tokens"
    ON kroger_oauth_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart_history"
    ON cart_history FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
