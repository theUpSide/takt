-- Create clients table for tracking organizations you have relationships with.
-- A client is an organization; engagements are the discrete scopes of work under it.
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  cage_code text,
  relationship_status text NOT NULL DEFAULT 'active'
    CHECK (relationship_status IN ('active', 'pursuit', 'follow_up', 'dormant')),
  relationship_started date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No duplicate client names per user (case-insensitive)
CREATE UNIQUE INDEX clients_user_name ON clients(user_id, lower(name));

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Indexes
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_relationship_status ON clients(relationship_status);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients"
  ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
