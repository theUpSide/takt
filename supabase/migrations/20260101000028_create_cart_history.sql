-- Grocery Cart Automation: cart fill history log (SDD §5.3)
-- Compensates for the Kroger API's lack of purchase history access.

CREATE TYPE cart_fill_status AS ENUM ('COMPLETE', 'PARTIAL', 'FAILED', 'ERROR');

CREATE TABLE cart_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    items_requested INTEGER NOT NULL DEFAULT 0,
    items_resolved INTEGER NOT NULL DEFAULT 0,
    items_added INTEGER NOT NULL DEFAULT 0,
    items_unavailable INTEGER NOT NULL DEFAULT 0,
    items_unresolved INTEGER NOT NULL DEFAULT 0,
    detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status cart_fill_status NOT NULL,
    error_message TEXT
);

CREATE INDEX cart_history_user_triggered_idx
    ON cart_history (user_id, triggered_at DESC);

CREATE INDEX cart_history_status_idx
    ON cart_history (status)
    WHERE status IN ('FAILED', 'ERROR');

COMMENT ON TABLE cart_history IS
    'One row per cart fill attempt. detail_json contains per-item outcome.';
