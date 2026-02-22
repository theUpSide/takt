-- Add investment_internal flag to charge_accounts
-- When true, hours logged to this account count toward IP investment / sweat equity
ALTER TABLE charge_accounts
  ADD COLUMN investment_internal boolean NOT NULL DEFAULT false;
