-- Bỏ 2 dòng tham chiếu secret: không code nào đọc, UI cũng bỏ hiển thị (quyết định của user).
-- Secret thật vẫn ở env var (ADR-11 phần cốt lõi giữ nguyên); DB/console không dính gì tới secret nữa.
DELETE FROM config WHERE config_key IN ('hq_api_key_ref', 'hq_hmac_secret_ref');
