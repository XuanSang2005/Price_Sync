package price_sync.mapping.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

import price_sync.domain.record.ChangeType;
import price_sync.domain.mapping.MappingRule;
import price_sync.domain.record.PriceRecord;


@Component
public class MntRowMapper {
    private final ValueMapParser valueMapParser;

    public MntRowMapper(ValueMapParser valueMapParser){
        this.valueMapParser = valueMapParser;
    }

    public Optional<MntRow> map(PriceRecord record, LocalDate businessDate, List<MappingRule> rules) {
        ChangeType changeType = ChangeType.valueOf(record.getChangeType().toUpperCase());
        MntRecordType recordType = (changeType == ChangeType.DELETE) ? MntRecordType.FDELE : MntRecordType.FDETL;
        Map<String, String> fields = buildFields(record, businessDate);
        List<MappingRule> applicable = rules.stream()
                .filter(rule -> rule.getRecordType().equals(recordType.name()))
                .sorted(Comparator.comparingInt(MappingRule::getPosition))
                .toList();

        List<String> columns = new ArrayList<>();
        for (MappingRule rule : applicable) {
            Optional<String> value = applyRule(rule, fields);
            if (value.isEmpty()) {
                return Optional.empty();
            }
            columns.add(value.get());
        }
        return Optional.of(new MntRow(recordType, columns));
    }


    public Map<String, String> buildFields(PriceRecord record, LocalDate businessDate) {
        Map<String, String> fields = new HashMap<>();

        fields.put("item_id", formatValue(record.getItemId()));
        fields.put("store_id_or_zone", formatValue(record.getStoreIdOrZone()));
        fields.put("price", formatValue(record.getPrice()));
        fields.put("currency", formatValue(record.getCurrency()));
        fields.put("effective_end", formatValue(record.getEffectiveEnd()));
        fields.put("change_type", formatValue(record.getChangeType()));
        fields.put("change_id", formatValue(record.getChangeId()));
        fields.put("version", formatValue(record.getVersion()));
        fields.put("effective_start", record.getEffectiveStart() != null
                ? formatValue(record.getEffectiveStart())
                : businessDate.plusDays(1).toString());

        if (record.getExtras() != null) {
            for (Map.Entry<String, Object> e : record.getExtras().entrySet()) {
                fields.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
            }
        }
        return fields;
    }


    private String formatValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof BigDecimal money) {
            return money.setScale(0, RoundingMode.HALF_UP).toPlainString();
        }
        if (value instanceof LocalDate date) {
            return date.toString();
        }
        return String.valueOf(value);
    }

    private Optional<String> applyRule(MappingRule rule, Map<String, String> fields) {
        String raw = fields.get(rule.getJsonField());
        switch (rule.getRuleType()) {
            case "DIRECT":
                return Optional.of(raw != null ? raw : "");
            case "DEFAULT":
                if (raw != null && !raw.isEmpty()) {
                    return Optional.of(raw);
                }
                return Optional.of(rule.getRuleValue() != null ? rule.getRuleValue() : "");
            case "VALUE_MAP": {
                if (raw == null) {
                    return Optional.empty();
                }
                String prefix = raw.split("_", 2)[0].toUpperCase();
                String mapped = valueMapParser.parse(rule.getRuleValue()).get(prefix);
                return mapped != null ? Optional.of(mapped) : Optional.empty();
            }
            case "SPLIT": {
                if (raw == null) {
                    return Optional.empty();
                }
                String[] parts = raw.split("_", 2);
                return Optional.of(parts.length > 1 ? parts[1] : "");
            }
            default:
                return Optional.of(raw != null ? raw : "");
        }
    }
}
