package price_sync.mapping.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

// Một luật động trong payload bulk Save. Record type nằm trên path, vị trí là thứ
// tự phần tử trong mảng; rule_value nullable khi DIRECT/SPLIT.
public record MappingCreateRequest(
        @JsonProperty("json_field") String jsonField,
        @JsonProperty("mnt_column") String mntColumn,
        @JsonProperty("rule_type") String ruleType,
        @JsonProperty("rule_value") String ruleValue,
        boolean required) {
}
