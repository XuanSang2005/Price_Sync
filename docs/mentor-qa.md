# Price Sync — Đề cương trả lời mentor

> Câu trả lời mẫu. Mỗi câu nhấn **cái gì** (ngắn) + **vì sao / đánh đổi** (phần mentor khoan sâu).
> Phản ánh trạng thái hiện tại: đã bỏ reflection + data_type/inference, giữ `required`, thêm escape RFC-4180, cột chuẩn khoá server-side.

---

## A. Kiến trúc & luồng

**A1. Vẽ luồng một batch từ HQ tới file MNT.**
HQ `POST /api/v1/price-events` → 4 lớp bảo mật (IP → HMAC → API key → timestamp) → `IntakeService` lưu batch (`RECEIVED`) + records **nguyên tử** trong 1 transaction, trả `202` ngay. **Nền:** `WorkDispatcher @Scheduled(10s)` claim batch bằng `SELECT ... FOR UPDATE SKIP LOCKED` → `BatchProcessor`: validate → verdict (abort nếu >20% set aside) → map (Mapper đọc `mapping_rule`) → build (stream ra temp file) → write (copy vào `xcenter-inbound/`) → batch `WRITTEN`/`PARTIAL`. **Đồng bộ** = phần intake (tới 202); **async** = phần xử lý.

**A2. Vì sao 202 async, không xử lý luôn?**
Tách "nhận" khỏi "xử lý". HQ chỉ cần biết đã nhận; không phải chờ map + ghi file (có thể chậm/lỗi). Lợi: HQ nhả nhanh không timeout, xử lý nặng làm nền + retry độc lập, chịu burst (lưu trước xử lý sau). Đánh đổi: có độ trễ (poll ~10s) trước khi file ra; phải có console theo dõi trạng thái vì HQ không biết kết quả cuối.

**A3. Vì sao DB làm hàng đợi thay vì Kafka/RabbitMQ?**
`FOR UPDATE SKIP LOCKED` trong tx ngắn = claim việc không đụng nhau; reaper thu hồi việc của instance chết. Lợi: **không thêm hạ tầng**, mọi trạng thái durable trong Postgres, instance stateless, đủ cho ~1 batch/đêm. Đổi sang broker khi throughput cao (nhiều msg/s), cần fan-out nhiều consumer, hoặc tách hệ. Ở quy mô này broker là over-kill.

**A4. 2 instance active-active tránh double-claim thế nào?**
Cả hai chạy cùng 3 timer (poll/reap/retry). `FOR UPDATE SKIP LOCKED` → 1 batch chỉ 1 instance claim (instance kia bỏ qua dòng đã khoá). Mỗi claim ghi lease (`owner_instance`, `claimed_at`). Reaper @60s: batch `PROCESSING` mà `claimed_at < now−5min` (owner chết) → reclaim → instance khác claim lại. Crash không kẹt việc.

---

## B. Mapping ⭐

**B1. `mapping_rule` biến record thành dòng MNT thế nào?**
Mỗi dòng `mapping_rule` = 1 cột file MNT (record_type, position, json_field, mnt_column, rule_type, rule_value). `Mapper.map(record)`: (1) `buildFields` gom field record về túi đã format; (2) lọc rule đúng record_type, sắp theo `position`; (3) mỗi rule → `applyRule`: DIRECT lấy thẳng / DEFAULT thiếu điền hằng / VALUE_MAP tra bảng prefix / SPLIT tách sau `_`; (4) ghép theo thứ tự → `MntRow`. Vd `store_id_or_zone=STORE_014` → cột LOC_TYPE `S` (VALUE_MAP) + LOCATION `014` (SPLIT).

**B2. Vì sao lưu mapping trong DB thay vì hardcode?**
Để đổi cách map **không sửa/deploy code** — operator chỉnh sổ qua UI, lần xử lý sau Mapper đọc sổ mới. Đánh đổi: cần UI/API quản trị + validate config; giá trị là String phải parse; không type-safe như code. Nhưng đúng nhu cầu: interface HQ/Xstore đổi thì sửa sổ, không release.

**B3. Vì sao `PUT` replace (xoá-ghi-lại) thay vì diff từng dòng?**
Một lần Save có thể vừa thêm/sửa/đổi thứ tự cột. Diff (cái nào thêm/xoá/sửa) phức tạp, dễ sót. Replace = gửi **trạng thái mong muốn đầy đủ** → backend xoá cột động cũ, ghi lại theo body, trong 1 transaction → đơn giản, nguyên tử, không nửa vời. Cột chuẩn thì replace **không đụng**.

**B4. Cột chuẩn khoá cứng ở server thế nào? Vì sao không tin client?**
`locked` là **cờ trong DB** (V19 seed true cho 7 cột chuẩn), **không suy** từ `json_field` (đổi được). `replace()` **không xoá, không ghi lại** cột locked — bỏ qua mọi thứ client gửi cho chúng, chỉ thay cột động. `delete()` trả 409 nếu locked. Vì output là **hợp đồng** điều khiển giá; một cột chuẩn bị repoint/xoá → sai giá hàng loạt, thiệt hại rơi vào store/khách → server phải là nguồn chân lý.

**B5. `extras` (JSONB) vs cột thật (ALTER TABLE): khi nào dùng cái nào?**
Field **lõi, ổn định, cần query/index/kiểu chặt** → cột thật (7 field chuẩn). Field **rìa, tùy chọn, operator thêm lúc chạy, không deploy** → `extras` JSONB (promo_code). ALTER TABLE mỗi field = migration + sửa entity + DTO + **deploy** → giết mục tiêu "operator thêm không cần dev". JSONB gom field tùy chọn vào 1 cột, không đổi schema. Mẫu "lõi cứng + rìa mềm" (như Stripe `metadata`).

**B6. Field động thêm không cần code — cơ chế gì?**
(1) Khai 1 dòng `mapping_rule` qua UI = **whitelist**. (2) HQ POST field đó → intake `@JsonAnySetter` hứng field lạ vào `extras`, lọc `existsByJsonField` chỉ giữ field **đã khai** → lưu JSONB. (3) `Mapper.buildFields` trải `extras` vào túi; rule ở position N → in ra cột. **Zero code, zero migration.**

**B7. Vì sao bỏ reflection ở `buildFields`? Reflection dùng đúng chỗ là ở đâu?**
7 field cố định biết trước lúc compile → **gọi getter tay** rõ hơn, nhanh hơn, compiler bắt lỗi, không cần mớ lọc rác. Reflection chỉ đáng khi làm việc với class **KHÔNG biết trước** lúc compile — đó là việc của **framework**: Jackson serialize POJO, Hibernate map entity, Spring DI (`@Autowired`/`@Component`), JUnit tìm `@Test`. Bạn hầu như **dùng** reflection qua framework, ít khi tự viết. "Thêm field không code" thật sự nhờ **`extras`**, không nhờ reflection.

---

## C. Validation ⭐

**C1. Vì sao validate field chuẩn nhưng không kiểm KIỂU field động? Ai chịu lỗi?**
Field chuẩn (price, currency, date) **điều khiển giá thật** → validate ngữ nghĩa để chặn giá sai **trước khi thành file** (thiệt hại rơi vào store/khách, không phải HQ). Field động hệ **không hiểu nghĩa** → shape-check giá trị thấp, hạ nguồn (Xstore) tự lo → **thả**, HQ chịu nội dung. Ranh giới: validate cái điều khiển tiền + toàn vẹn file; nội dung field lạ thì thả.

**C2. Shape-check vs semantic-check?**
Shape-check = "có phải số/ngày/có mặt không" (hình dạng). Semantic-check = "có hợp lý nghiệp vụ không" (price>0, currency 3 ký tự, date_range đúng). Field chuẩn hệ hiểu nghĩa → semantic-check được. Field động hệ chưa từng thấy → chỉ shape-check, không biết "promo_pct=250 là vô lý". Muốn semantic-check field động phải viết rule cứng → hết "động".

**C3. Vì sao giữ `required` mà bỏ `data_type`?**
`required` = "field bắt buộc có mặt" — kiểm **rẻ, rõ ràng, không cần hiểu nghĩa**, defensible (thiếu field hạ nguồn cần → hỏng load). `data_type` = shape-check kiểu — **giá trị thấp** (hệ không hiểu, dễ đoán sai `"007"`→NUMBER, hạ nguồn tự lo) → bỏ. Toàn vẹn **định dạng** file thì lo bằng **escape RFC-4180**, không phải type-check.

**C4. Ngưỡng abort 20% để làm gì?**
Nếu >20% record set aside → `markFail` **cả batch**, không ship file. Bảo vệ hạ nguồn: thà **không gửi gì** còn hơn gửi file mà một mảng lớn sai (mis-price hàng loạt). Là quyết định nghiệp vụ (`abort_threshold` config trong DB, chỉnh không deploy).

---

## D. File MNT & toàn vẹn ⭐

**D1. Escape RFC-4180 là gì? Vì sao quan trọng hơn type-check?**
File positional/CSV: giá trị chứa **phẩy / nháy / xuống dòng** sẽ bẻ cột (→ hỏng cả dòng) hoặc tách record. Escape: ô "bẩn" thì **bọc trong nháy kép** + **nhân đôi** nháy bên trong (`"` → `""`). Quan trọng hơn type-check vì đây là rủi ro **toàn vẹn cả file** (một ô bẩn hỏng **các record khác**), còn type sai chỉ ảnh hưởng 1 ô/1 record.

**D2. `FHEAD`/`FTAIL` để làm gì?**
`FHEAD,<businessDate>` = dòng đầu, header + ngày nghiệp vụ. `FTAIL,<N>` = dòng cuối, N = **số dòng detail** (đếm FDETL+FDELE). Để DataLoader kiểm toàn vẹn (đọc đủ N dòng chưa, file có bị cắt không).

**D3. Vì sao stream ra file thay vì dựng chuỗi trong RAM?**
Ghi từng dòng (`Files.newBufferedWriter`) thay vì nối cả String → **bộ nhớ bị chặn**, batch 1 triệu record không nổ heap. Try-with-resources đóng file an toàn kể cả khi lỗi.

**D4. "Positional contract" nghĩa là gì? Thêm cột có an toàn không?**
Xstore/DataLoader đọc file theo **vị trí cột** (cột 4 = price…), không theo tên → thứ tự cột là hợp đồng cố định. Thêm cột chỉ an toàn khi **bên tiêu thụ đã chờ** cột đó; thêm cột lạ mà consumer không biết = vô nghĩa/hỏng. Đó là lý do cột chuẩn khoá vị trí, cột động thêm vào **cuối**.

---

## E. Bảo mật

**E1. 4 lớp bảo mật intake?**
IP allowlist (**403** IP lạ) → HMAC-SHA256 (**401** chữ ký sai) → API key header (**401** thiếu/sai) → timestamp window (**401** lệch giờ quá skew). Chỉ chắn `/price-events` (`shouldNotFilter` cho phần còn lại). Defense-in-depth.

**E2. HMAC hoạt động thế nào? Vì sao ký `ts+body`?**
Client ký `HMAC-SHA256(secret, ts+body)` → gửi `X-Signature` + `X-Timestamp`. Server tính lại bằng cùng secret, so khớp → **integrity** (body không bị sửa) + **authenticity** (đúng người có secret), secret **không lên đường truyền**. Ký cả `ts` để chống **replay**: đổi ts thì chữ ký hỏng (không forge được vì thiếu secret); + timestamp window loại request cũ.

**E3. Vì sao filter là plain class chứ không `@Component`?**
`@Component` → Spring Boot tự đăng ký filter cho **mọi** request (chạy 2 lần / sai phạm vi). Nên viết plain class, tự `new` trong `SecurityConfig` với giá trị từ `@Value`, `addFilterBefore` đúng thứ tự → kiểm soát chính xác.

**E4. `CachedBodyHttpServletRequest` để làm gì?**
Body InputStream đọc **một lần**. Filter HMAC đọc body để tính chữ ký → controller `@RequestBody` đọc lại sẽ rỗng. Wrapper đọc hết bytes vào cache, phục vụ lại stream mới mỗi lần → cả filter lẫn controller đọc được.

**E5. `/mappings` chưa auth — rủi ro? Khắc phục?**
Request thô có thể sửa/xoá cột. Đã **giảm thiểu** bằng logic server (cột chuẩn không đụng được, delete 409). Khắc phục đầy đủ: đưa `/mappings` ra **sau lớp auth** (admin role) — nợ kỹ thuật.

---

## F. Persistence & Spring Data

**F1. `@Transactional` làm gì? Dirty checking? Khi nào rollback?**
Bọc method trong 1 tx: mọi lệnh **cùng commit hoặc cùng rollback** (nguyên tử); ném `RuntimeException` → rollback. Dirty checking: entity đang "managed" mà đổi field → Hibernate **tự UPDATE** lúc commit (không cần `save()`). Spring cài bằng **proxy** (AOP).

**F2. `flush()` để làm gì trong `replace()`?**
Hibernate "write-behind": xếp INSERT/DELETE, flush lúc commit, **có thể đảo thứ tự**. Trong replace ta xoá cột động cũ rồi chèn mới; nếu chèn (position X) **trước** xoá (position X cũ) → đụng `UNIQUE(record_type, position)`. `flush()` ép DELETE xuống DB **trước** → chèn sau không đụng.

**F3. Derived query (`existsByJsonField`) — Spring sinh SQL thế nào?**
Khai **tên method** theo quy ước → Spring Data đọc tên → sinh SQL: `existsByJsonField(x)` → `SELECT count(*)>0 WHERE json_field=x`. Interface không viết thân, Spring tạo impl lúc khởi động. `extends JpaRepository<MappingRule, Long>` cho sẵn `save/findAll/findById/delete…`

**F4. Vì sao trả DTO chứ không entity?**
Entity = hình dạng **DB** (camelCase, gắn schema, dễ lộ field nội bộ). DTO = hợp đồng **API** (snake_case qua `@JsonProperty`, chọn field lộ). DTO là **bộ giảm chấn**: đổi cột DB không vỡ client, không lộ nhầm dữ liệu.

**F5. Idempotency 2 tầng?**
`uq_batch(batch_id, version)`: gửi lại cùng batch → **409, no-op** (không xử lý 2 lần). `uq_change(change_id, version)`: trong batch, bản version cao **supersede** bản thấp (record cũ đánh `SUPERSEDED`, không ghi). Chống trùng cả cấp batch lẫn record.

---

## G. Lỗi & retry

**G1. `WRITTEN`/`PARTIAL`/`FAILED`/`PENDING_WRITE` khác nhau?**
WRITTEN = ghi OK, đủ record. PARTIAL = ghi OK nhưng có record set aside (loại khỏi file). FAILED = abort verdict (>20% hỏng) **hoặc** ghi thất bại quá 6 lần. PENDING_WRITE = ghi lỗi, đang chờ retry.

**G2. Backoff khi ghi lỗi?**
`markPendingWrite`: `retryCount++`, `next_retry_at = now + min(30 << (retryCount−1), 600)`s (30→60→120…**cap 10 phút**). Retry scheduler @15s claim batch `PENDING_WRITE` tới hạn → chạy lại map→build→write từ **record durable** (file transient, record bền). Sau **6 lần** → FAILED + alert.

**G3. Vì sao `PENDING_WRITE` phải commit ở transaction RIÊNG?**
`mapBatch` lỗi ghi → tx đó **rollback**. `poll()` (non-tx) catch **sau** rollback → mở tx **MỚI** gọi `markPendingWrite` → mới lưu được trạng thái. Nếu cùng tx với mapBatch thì rollback cuốn luôn → mất trạng thái.

**G4. Re-drive vs retry tự động?**
Retry tự động: scheduler thử lại PENDING_WRITE theo backoff (lỗi **tạm** — folder khoá…). Re-drive: operator `POST /events/{id}/retry` cho batch **FAILED** (đã cạn retry) → `redrive` (PENDING_WRITE, reset retryCount) để thử lại **thủ công** sau khi khắc phục gốc.

---

## H. Test

**H1. Test gì, không test gì?**
Unit thuần core: Validator (rules), Mapper (map + location split + unmappable), XstoreMntBuilder (golden file), BatchProcessor (Mockito — verdict/PARTIAL/supersede) + contextLoads smoke. **Chưa** test: web layer (controllers/filters), repo (`@DataJpaTest`). Core logic coverage cao.

**H2. Golden-file test là gì?**
So output file **byte-đối-byte** với file kỳ vọng (`containsExactly` từng dòng). Bắt lỗi định dạng tinh vi: vụ FHEAD dùng space thay phẩy, `FTAIL, 4` thừa space — aggregate count không lộ, **chỉ golden-file bắt**.

**H3. Khi nào mock, khi nào real?**
Mock: I/O / boundary (repo, writer, builder) — cô lập, không đụng DB/file. Real: hàm thuần **đã test** (Validator, Mapper), value object rẻ (PriceRecord). Over-mock = test cái mock chứ không phải code.

**H4. "Test này có đỏ nếu code sai không?"**
Kiểm **sức mạnh** test. Từng bắt false-green: test unmappable dùng prefix **hợp lệ** + assert `isPresent` → luôn xanh dù code sai → sửa thành prefix lạ + `isEmpty`. Test phải **đỏ khi code sai** mới có giá trị.

---

## I. Vận hành / production

**I1. 10k record nhanh — vì sao? Giới hạn khi scale triệu record?**
Nhanh vì: intake **async** (202 ngay), xử lý **in-memory** (records+rules nạp 1 query, loop RAM), file **stream**, không show-sql; 10k là nhỏ với CPU. Giới hạn triệu record: cả batch **1 transaction + nạp hết vào List RAM** (nên chunk); dirty-checking 1 triệu UPDATE không có `hibernate.jdbc.batch_size`; (reflection đã bỏ).

**I2. Secret quản lý thế nào? Vì sao không commit?**
Secret (HQ_API_KEY, HMAC, gmail app-password) trong **env var** (properties chỉ giữ `${...}`), **fail-fast** nếu thiếu. `run.sh` chứa secret → **gitignore**, không commit. Prod nên externalize ra `.env`/secret store.

**I3. Alert email best-effort — vì sao không để lỗi mail phá pipeline?**
`AlertService` gửi mail trong try/catch: gửi lỗi chỉ **log**, KHÔNG ném → pipeline không chết vì mail. Alert là phụ trợ, không được phá việc chính (ghi file giá).

**I4. Deploy?**
`npm run build` bundle SPA vào `static/` của Spring → **1 jar** phục vụ cả UI + API (`SpaController` forward client routes). Dockerfile 3-stage (node build UI → maven package → JRE run); compose: postgres + app + mailpit. 2 instance active-active (FOR UPDATE SKIP LOCKED + reaper đã lo an toàn).

**I5. Observability?**
Hiện: log SLF4J + `/health` tự viết (kiểm API + DB). **Chưa** Actuator/Micrometer/metrics — nợ (chương observability). Health strip UI ping `/health`.

---

## J. Đào sâu Java/Spring (gotcha)

**J1. Reflection vs gọi tay — khi nào dùng cái nào?**
Tay khi **biết kiểu lúc compile** (≈99% code app) — rõ, nhanh, compiler bắt lỗi. Reflection khi làm việc với kiểu **KHÔNG biết trước** (framework/lib generic, load class theo tên). Tự viết reflection trong code nghiệp vụ thường là giải sai bài.

**J2. `instanceof Number` đọc kiểu JSON gốc — vì sao chính xác hơn parse chuỗi?**
JSON mã hoá kiểu bằng **dấu nháy**: `12.5` (không nháy)=number, `"007"` (nháy)=string. Jackson đọc → Java `Number` vs `String`, **giữ kiểu gốc**. `instanceof Number` đọc kiểu **thật** HQ gửi; parse chuỗi `"007"` thì tưởng số → sai. (Đã bỏ inference nhưng nguyên lý vẫn đúng.)

**J3. Vì sao `BigDecimal` cho tiền, không `double`?**
Tiền cần chính xác thập phân **tuyệt đối**; `double` là nhị phân xấp xỉ (`0.1+0.2≠0.3`) → sai tiền. `BigDecimal` chính xác + kiểm soát scale/rounding (`setScale(0, HALF_UP)` cho VND).

**J4. `LinkedHashSet` vs `HashSet`?**
Cần **giữ thứ tự chèn** (source_fields hiện đúng thứ tự cột đích) + tự dedup → `LinkedHashSet`. `HashSet` dedup nhưng **xáo trộn** thứ tự.

**J5. `Optional` để làm gì?**
Bọc "có thể không có" **tường minh**, buộc caller xử lý vắng mặt, tránh NPE (`map().orElse()`, `orElseThrow()`). Thay `null` (dễ quên kiểm) bằng kiểu **nói rõ** "có thể rỗng".

---

## K. Phản tư ⭐

**K1. Chỗ nào bạn over-engineer?**
Reflection ở `buildFields` cho 7 field cố định (đã gỡ, gọi tay). `data_type` + inference + auto-only cho field động (đã gỡ — hệ không hiểu nghĩa nên type-check giá trị thấp). Bài học: chỉ validate cái **điều khiển tiền + toàn vẹn file**, đừng "khoe" cơ chế.

**K2. Nếu làm lại, làm khác chỗ nào?**
Đặt **escape RFC-4180 từ đầu** (toàn vẹn file quan trọng hơn type-check); không xây type inference; cân nhắc **chunk record** từ đầu cho scale; **auth `/mappings`** sớm.

**K3. Nợ kỹ thuật lớn nhất?**
`/mappings` chưa auth; **cross-batch supersede** (correction ở batch sau) chưa có; Actuator/metrics chưa; config chưa cache/versioned/optimistic-lock; graceful `uq_change` (trùng record → 500 thay vì 409); state `WRITING` trung gian.

**K4. Ranh giới trách nhiệm của hệ?**
**Validate:** field chuẩn (semantic — điều khiển giá) + `required` field động (có mặt) + **toàn vẹn file** (escape). **Thả:** nội dung/kiểu field động (HQ chịu). "Chỉ map" đúng với **nội dung field lạ**, sai với **độ đúng giá + toàn vẹn file**.
