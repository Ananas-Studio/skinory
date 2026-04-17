-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on product names for efficient ILIKE %search% queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
ON products USING gin (name gin_trgm_ops);

-- Composite indexes (also managed by Sequelize sync, but declared here for clarity)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_user_status_date
ON scans (user_id, result_status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advice_sessions_user_date
ON advice_sessions (user_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_category
ON products (is_active, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_inv_status
ON inventory_items (inventory_id, status);
