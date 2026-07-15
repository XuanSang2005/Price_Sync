# Postman — price_sync API tests

Bộ test toàn bộ API tính đến hiện tại: **Intake** (4 lớp bảo mật), **Retry**, **Console read**.

## Cách dùng

1. Chạy app: `./mvnw spring-boot:run` (phải nghe ở `http://localhost:8080`).
2. Postman → **Import** → chọn `price_sync.postman_collection.json`.
3. Chạy bằng **Collection Runner** (nút **Run**), **giữ đúng thứ tự** — vì:
   - `409` gửi lại đúng `batch_id` mà `202` vừa tạo (test của `202` lưu vào biến `dupBatchId`).
   - `detail` dùng id mà `list` lấy được (test của `list` lưu vào `detailId`).

## Các trường hợp phủ

| Folder | Request | Kỳ vọng |
|---|---|---|
| Intake | Batch hợp lệ | **202** |
| Intake | Batch trùng (gửi lại) | **409** |
| Intake | Sai API key | **401** |
| Intake | Sai chữ ký HMAC | **401** |
| Intake | Timestamp hết hạn | **401** |
| Retry | id không tồn tại | **404** |
| Retry | Re-drive batch FAILED | **202** *(cần dữ liệu)* |
| Retry | Retry batch không FAILED | **200** *(cần dữ liệu)* |
| Console | Danh sách events | **200** |
| Console | Metrics | **200** |
| Console | Chi tiết 1 event | **200** |
| Console | Chi tiết id không tồn tại | **404** |

## Hai request phụ thuộc dữ liệu (Retry 202 / 200)

Trạng thái batch không cố định, nên trước khi chạy hãy đặt biến trong collection:
- `failedId` = id một batch đang **FAILED** → request "Re-drive batch FAILED" ra 202.
- `okId` = id một batch **không FAILED** (vd WRITTEN) → request "Retry batch không FAILED" ra 200.

Xem id qua `GET /api/v1/events` hoặc psql. Nếu chưa có batch FAILED, cứ bỏ qua 2 request này (không ảnh hưởng các test khác).

## Chữ ký HMAC được tính thế nào

Endpoint intake (`/api/v1/price-events`) yêu cầu 4 header: `X-Api-Key`, `X-Timestamp`, `X-Signature` (+ IP allowlist). Pre-request script của folder **Intake** tự tính:

```
sig = HMAC-SHA256( timestamp + body , secret )   →  hex
```

- `secret` = `shared-secret-abc` (biến `hmacSecret`).
- `body` = đúng chuỗi JSON gửi đi (script dùng `pm.variables.replaceIn` để khớp từng byte server nhận).
- Set `X-Timestamp` = timestamp, `X-Signature` = sig.

Các biến bí mật để trong `variable` của collection — đổi tại đây nếu `application.properties` đổi.

> IP allowlist (403) không test được từ localhost (localhost luôn nằm trong allowlist), nên không có request cho lớp này.
