-- Bỏ pickup_mode: chỉ có một mode (in_place) được implement, config này không dùng tới.
-- V8 đã apply nên KHÔNG sửa nó (checksum bất biến) — gỡ bằng migration mới.
DELETE FROM config WHERE config_key = 'pickup_mode';
