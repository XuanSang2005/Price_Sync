-- Keep the console list, attention queue, and hourly dashboard queries responsive
-- as the batch table grows.
CREATE INDEX IF NOT EXISTS idx_price_batch_status_id
    ON price_batch (status, id DESC);

CREATE INDEX IF NOT EXISTS idx_price_batch_generated_at
    ON price_batch (generated_at);
