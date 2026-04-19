-- Grocery Cart Automation: product mappings table (SDD §5.1)
-- Maps user shorthand aliases to exact Kroger product UPCs.
-- Rows are manually curated; never created automatically.

CREATE TABLE product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    kroger_upc VARCHAR(20) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    default_quantity INTEGER NOT NULL DEFAULT 1 CHECK (default_quantity > 0),
    category VARCHAR(50),
    allergen_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alias uniqueness is scoped per user + alias + UPC so multi-product aliases
-- are supported (SDD §7.3) while preventing exact duplicates.
CREATE UNIQUE INDEX product_mappings_user_alias_upc_key
    ON product_mappings (user_id, alias, kroger_upc);

CREATE INDEX product_mappings_user_alias_active_idx
    ON product_mappings (user_id, alias)
    WHERE is_active = true;

CREATE INDEX product_mappings_user_category_idx
    ON product_mappings (user_id, category)
    WHERE is_active = true;

-- Normalize alias on write: lowercase + trim. Whitespace collapsing is
-- handled at the application layer to keep the DB rule simple.
CREATE OR REPLACE FUNCTION product_mappings_normalize_alias()
RETURNS TRIGGER AS $$
BEGIN
    NEW.alias := lower(btrim(NEW.alias));
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_mappings_normalize
    BEFORE INSERT OR UPDATE ON product_mappings
    FOR EACH ROW EXECUTE FUNCTION product_mappings_normalize_alias();

COMMENT ON TABLE product_mappings IS
    'Grocery alias → Kroger UPC mapping. Manually curated for allergen safety.';
