package price_sync.mapping.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

// Một record THẬT: before = field nguồn (hiển thị), fields = giá trị ĐÃ FORMAT (đầu vào rule engine,
// để FE áp luật nháp cho ra "after" khớp y backend), after = các cột MNT theo luật ĐÃ LƯU.
public record PreviewRow(
        @JsonProperty("before") Map<String, String> before,
        @JsonProperty("fields") Map<String, String> fields,
        @JsonProperty("record_type") String recordType,
        @JsonProperty("after") List<String> after,
        @JsonProperty("mappable") boolean mappable,
        @JsonProperty("note") String note) {
}
