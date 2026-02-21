-- Create time_entries table for timekeeping
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  category text NOT NULL CHECK (category IN (
    'product_dev', 'bd_outreach', 'client_work',
    'content', 'admin', 'professional_dev'
  )),
  description text,
  task_id uuid REFERENCES items(id) ON DELETE SET NULL,
  billable boolean NOT NULL DEFAULT false,
  client_name text,
  rate_override numeric(8,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No future dates allowed
ALTER TABLE time_entries ADD CONSTRAINT time_entries_no_future_date
  CHECK (entry_date <= CURRENT_DATE);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entries_updated_at();

-- Indexes
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX idx_time_entries_category ON time_entries(category);
CREATE INDEX idx_time_entries_task_id ON time_entries(task_id) WHERE task_id IS NOT NULL;

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own time entries"
  ON time_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
