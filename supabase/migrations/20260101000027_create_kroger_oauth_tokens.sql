-- Grocery Cart Automation: Kroger OAuth token store (SDD §5.2)
-- Tokens are AES-256 encrypted at rest; encryption is performed by the
-- edge function using a key from Supabase Vault, then stored as bytea.

CREATE TABLE kroger_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token_ciphertext BYTEA NOT NULL,
    access_token_iv BYTEA NOT NULL,
    refresh_token_ciphertext BYTEA NOT NULL,
    refresh_token_iv BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    store_id VARCHAR(20) NOT NULL,
    refresh_lock_held_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One token row per user. Enforced so refresh operations have a unique
-- target and don't race against duplicate rows.
CREATE UNIQUE INDEX kroger_oauth_tokens_user_key
    ON kroger_oauth_tokens (user_id);

CREATE OR REPLACE FUNCTION kroger_oauth_tokens_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kroger_oauth_tokens_touch
    BEFORE UPDATE ON kroger_oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION kroger_oauth_tokens_touch_updated_at();

COMMENT ON TABLE kroger_oauth_tokens IS
    'Kroger API OAuth tokens. Ciphertext + IV stored; key lives in Vault.';
