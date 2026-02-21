-- Create charge_accounts table for pre-configured billing profiles
CREATE TABLE IF NOT EXISTS charge_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  billable boolean NOT NULL DEFAULT false,
  client_name text,
  hourly_rate numeric(8,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No duplicate names per user (case-insensitive)
CREATE UNIQUE INDEX charge_accounts_user_name ON charge_accounts(user_id, lower(name));

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_charge_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER charge_accounts_updated_at
  BEFORE UPDATE ON charge_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_charge_accounts_updated_at();

-- Index
CREATE INDEX idx_charge_accounts_user_id ON charge_accounts(user_id);

-- Enable RLS
ALTER TABLE charge_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own charge accounts"
  ON charge_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
