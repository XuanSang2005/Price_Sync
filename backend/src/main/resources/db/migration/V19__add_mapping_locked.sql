-- Cột chuẩn (hợp đồng Oracle) khoá cứng ở console: không đổi nguồn / không xoá.
-- Đánh dấu bằng CỜ ỔN ĐỊNH trong DB thay vì suy từ json_field ở UI (json_field đổi được → suy sai:
-- kéo nguồn lạ vào cột chuẩn làm tuột khoá, hoặc cột tự thêm bị khoá oan).
ALTER TABLE mapping_rule ADD COLUMN locked boolean NOT NULL DEFAULT false;

-- Các dòng SEED chuẩn (V15) map từ 6 field nguồn cố định của PriceRecord → khoá cứng.
-- Rule tự thêm qua API dùng json_field khác → giữ locked=false (constructor không set).
UPDATE mapping_rule
SET locked = true
WHERE json_field IN ('item_id', 'store_id_or_zone', 'price', 'currency', 'effective_start', 'effective_end');
