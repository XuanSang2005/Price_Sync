-- Bỏ rate_limit_per_min: quyết định KHÔNG implement rate limiting (YAGNI — HQ gửi ~1 batch/đêm).
-- Config không ai đọc là config chết. V8 đã apply nên gỡ bằng migration mới.
DELETE FROM config WHERE config_key = 'rate_limit_per_min';
