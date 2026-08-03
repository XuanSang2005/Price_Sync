-- The console intentionally supports substring search. A trigram index keeps
-- it bounded as batch history grows; escaped LIKE input preserves literal %, _.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_price_batch_batch_id_trgm
    ON price_batch USING gin (LOWER(batch_id) gin_trgm_ops);
