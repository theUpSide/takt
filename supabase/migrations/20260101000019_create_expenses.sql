-- Create expenses table for expense tracking
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL CHECK (category IN (
    'software_tools', 'equipment', 'professional_dev',
    'travel', 'marketing', 'insurance',
    'legal_professional', 'office_supplies', 'other'
  )),
  vendor text,
  description text,
  receipt_path text,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No future dates allowed
ALTER TABLE expenses ADD CONSTRAINT expenses_no_future_date
  CHECK (expense_date <= CURRENT_DATE);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses"
  ON expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
