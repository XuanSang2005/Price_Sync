package price_sync.mapping;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.batch.PriceBatch;
import price_sync.domain.batch.PriceBatchRepository;
import price_sync.domain.mapping.MappingRule;
import price_sync.domain.mapping.MappingRuleRepository;
import price_sync.domain.record.PriceRecord;
import price_sync.domain.record.PriceRecordRepository;
import price_sync.error.InValidIdException;
import price_sync.error.LockedMappingException;
import price_sync.mapping.dto.MappingCreateRequest;
import price_sync.mapping.dto.MappingMeta;
import price_sync.mapping.dto.MappingResponse;
import price_sync.mapping.dto.PreviewResponse;
import price_sync.mapping.dto.PreviewRow;
import price_sync.processing.mapper.Mapper;
import price_sync.processing.mapper.MntRow;

@Service
public class MappingService {
    private final MappingRuleRepository mappingRuleRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final Mapper mapper;

    public MappingService(MappingRuleRepository mappingRuleRepository, PriceBatchRepository priceBatchRepository,
            PriceRecordRepository priceRecordRepository, Mapper mapper) {
        this.mappingRuleRepository = mappingRuleRepository;
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.mapper = mapper;
    }

    @Transactional
    public List<MappingResponse> getAll() {
        return mappingRuleRepository.findAll().stream()
                .sorted(Comparator.comparing(MappingRule::getRecordType).thenComparingInt(MappingRule::getPosition))
                .map(r -> new MappingResponse(r.getId(), r.getRecordType(), r.getPosition(), r.getJsonField(),
                        r.getMntColumn(), r.getRuleType(), r.getRuleValue(), r.getDataType(), r.isRequired(),
                        r.isLocked()))
                .toList();
    }

    // Cột CHUẨN nhận diện bằng tên cột MNT (hợp đồng output cố định). Đây là HỢP ĐỒNG:
    // server GIỮ NGUYÊN — client (kể cả curl thô) KHÔNG tạo trùng / xoá / sửa / bỏ sót được.
    private static final Set<String> STANDARD_MNT_COLUMNS =
            Set.of("ITEM", "LOC_TYPE", "LOCATION", "PRICE", "CURRENCY", "EFF_START", "EFF_END");

    @Transactional
    public void create(MappingCreateRequest req) {
        if (STANDARD_MNT_COLUMNS.contains(req.mntColumn())) {
            throw new LockedMappingException(); // cột chuẩn đã có sẵn, khoá cứng — không tạo trùng
        }
        mappingRuleRepository.save(new MappingRule(req.recordType(), req.position(), req.jsonField(),
                req.mntColumn(), req.ruleType(), req.ruleValue(), req.dataType(), req.required()));
    }

    @Transactional
    public void delete(Long id) {
        MappingRule rule = mappingRuleRepository.findById(id).orElseThrow(InValidIdException::new);
        if (rule.isLocked()) {
            throw new LockedMappingException(); // không cho xoá cột chuẩn
        }
        mappingRuleRepository.delete(rule);
    }

    // Bulk-replace CHỈ các cột ĐỘNG của một record_type (bấm Save trên UI kéo-thả).
    // Cột chuẩn (locked) là hợp đồng: server GIỮ NGUYÊN từ DB, bỏ qua mọi bản client gửi lên —
    // nên dù client repoint/reorder/omit một cột chuẩn thì file MNT vẫn đúng.
    @Transactional
    public void replace(String recordType, List<MappingCreateRequest> rules) {
        List<MappingRule> current = mappingRuleRepository.findAll().stream()
                .filter(r -> r.getRecordType().equals(recordType))
                .toList();
        int maxLockedPos = current.stream().filter(MappingRule::isLocked)
                .mapToInt(MappingRule::getPosition).max().orElse(0);
        // xoá CHỈ cột động cũ, giữ nguyên cột chuẩn
        current.stream().filter(r -> !r.isLocked()).forEach(mappingRuleRepository::delete);
        mappingRuleRepository.flush(); // ép DELETE xuống trước, tránh INSERT đụng uq_mapping_slot
        // chèn cột động mới, position nối SAU khối cột chuẩn; cột chuẩn client gửi thì bỏ qua
        int pos = maxLockedPos;
        for (MappingCreateRequest req : rules) {
            if (STANDARD_MNT_COLUMNS.contains(req.mntColumn())) {
                continue;
            }
            pos++;
            mappingRuleRepository.save(new MappingRule(recordType, pos, req.jsonField(),
                    req.mntColumn(), req.ruleType(), req.ruleValue(), req.dataType(), req.required()));
        }
    }

    // Preview THẬT: lấy vài record của batch gần nhất có dữ liệu, áp luật hiện tại → before/after.
    @Transactional
    public PreviewResponse preview() {
        List<MappingRule> rules = mappingRuleRepository.findAll();
        List<PriceBatch> batches = new ArrayList<>(priceBatchRepository.findAll());
        batches.sort(Comparator.comparingLong(PriceBatch::getId).reversed());

        for (PriceBatch batch : batches) {
            List<PriceRecord> records = priceRecordRepository.findByBatchId(batch.getId());
            if (records.isEmpty()) {
                continue;
            }
            LocalDate businessDate = batch.getGeneratedAt().toLocalDate();
            // Lấy tối đa 3 record MỖI loại (FDETL/FDELE) để tab nào cũng có mẫu preview,
            // tránh "No sample" oan khi 5 record đầu tình cờ cùng một loại.
            List<PriceRecord> sample = new ArrayList<>();
            int det = 0;
            int del = 0;
            for (PriceRecord r : records) {
                boolean isDelete = "delete".equalsIgnoreCase(r.getChangeType());
                if (isDelete && del < 3) {
                    sample.add(r);
                    del++;
                } else if (!isDelete && det < 3) {
                    sample.add(r);
                    det++;
                }
                if (det >= 3 && del >= 3) {
                    break;
                }
            }
            List<PreviewRow> rows = new ArrayList<>();
            for (PriceRecord r : sample) {
                Optional<MntRow> mapped = mapper.map(r, businessDate, rules);
                String recordType = mapped.map(m -> m.recordType().name())
                        .orElse("delete".equalsIgnoreCase(r.getChangeType()) ? "FDELE" : "FDETL");
                rows.add(new PreviewRow(
                        before(r),
                        mapper.buildFields(r, businessDate),
                        recordType,
                        mapped.map(MntRow::columns).orElse(null),
                        mapped.isPresent(),
                        mapped.isPresent() ? null : "unmappable — prefix lạ hoặc thiếu field bắt buộc"));
            }
            return new PreviewResponse(businessDate.toString(), batch.getBatchId(), rows);
        }
        return new PreviewResponse(null, null, List.of());
    }

    // Metadata cho UI: source_fields ĐỘNG (reflection getter PriceRecord + extras đã khai),
    // record/rule/standard là hằng single-source ở backend (không để FE hardcode nữa).
    @Transactional
    public MappingMeta meta() {
        // 1) Field nguồn cố định: duyệt getter của PriceRecord bằng reflection → snake_case
        //    (bỏ các getter nội bộ không phải field nghiệp vụ).
        Set<String> skip = Mapper.INTERNAL_FIELDS; // CHUNG với Mapper.buildFields → nguồn khớp field phân giải được
        Set<String> fields = new LinkedHashSet<>();
        for (Method g : PriceRecord.class.getMethods()) {
            if (g.getParameterCount() != 0 || !g.getName().startsWith("get") || g.getName().equals("getClass")) {
                continue;
            }
            if (g.getReturnType() == void.class) {
                continue;
            }
            String name = toSnakeCase(g.getName().substring(3));
            if (!skip.contains(name)) {
                fields.add(name);
            }
        }
        // 2) + field ĐỘNG đã khai trong sổ (extras như promo_code) mà chưa có ở trên
        for (MappingRule r : mappingRuleRepository.findAll()) {
            fields.add(r.getJsonField());
        }
        return new MappingMeta(
                new ArrayList<>(fields),
                List.of("FDETL", "FDELE"), // loại record Mapper sinh ra (delete→FDELE, còn lại→FDETL)
                List.of("DIRECT", "DEFAULT", "VALUE_MAP", "SPLIT"), // khớp Mapper.applyRule
                List.of("STRING", "NUMBER", "DATE"), // kiểu kiểm shape field động (khớp Validator)
                List.of("item_id", "store_id_or_zone", "price", "currency", "effective_start", "effective_end"));
    }

    // "ItemId" → "item_id" (giống Mapper).
    private String toSnakeCase(String camel) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < camel.length(); i++) {
            char c = camel.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) {
                    out.append('_');
                }
                out.append(Character.toLowerCase(c));
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    // Field nguồn của một record (before) — theo thứ tự dễ đọc.
    private Map<String, String> before(PriceRecord r) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("item_id", ns(r.getItemId()));
        m.put("store_id_or_zone", ns(r.getStoreIdOrZone()));
        m.put("price", r.getPrice() != null ? r.getPrice().toPlainString() : "");
        m.put("currency", ns(r.getCurrency()));
        m.put("effective_start", r.getEffectiveStart() != null ? r.getEffectiveStart().toString() : "");
        m.put("effective_end", r.getEffectiveEnd() != null ? r.getEffectiveEnd().toString() : "");
        m.put("change_type", ns(r.getChangeType()));
        m.put("version", String.valueOf(r.getVersion()));
        m.put("change_id", ns(r.getChangeId())); // đối xứng với version — để nguồn có giá trị trong preview
        if (r.getExtras() != null) {
            for (Map.Entry<String, Object> e : r.getExtras().entrySet()) {
                m.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
            }
        }
        return m;
    }

    private String ns(String s) {
        return s != null ? s : "";
    }
}
