-- Create engagements table - discrete scopes of work under a client.
-- One client may have multiple concurrent or sequential engagements,
-- each with its own billing structure.
CREATE TABLE IF NOT EXISTS engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
  title text NOT NULL,
  engagement_type text NOT NULL
    CHECK (engagement_type IN ('hourly_1099', 'retainer', 'fixed_price', 'pursuit')),
  billing_rate numeric(8,2),        -- used by hourly_1099
  retainer_hours numeric(6,2),      -- expected hours/month for retainer
  fixed_price numeric(10,2),        -- total contract value for fixed_price
  start_date date,
  end_date date,                    -- nullable = ongoing
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'complete', 'lost')),
  scope_description text,
  charge_account_id uuid REFERENCES charge_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON engagements
  FOR EACH ROW
  EXECUTE FUNCTION update_engagements_updated_at();

-- Indexes
CREATE INDEX idx_engagements_user_id ON engagements(user_id);
CREATE INDEX idx_engagements_client_id ON engagements(client_id);
CREATE INDEX idx_engagements_status ON engagements(status);
CREATE INDEX idx_engagements_charge_account_id
  ON engagements(charge_account_id) WHERE charge_account_id IS NOT NULL;

-- Enable RLS
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own engagements"
  ON engagements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
