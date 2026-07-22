package price_sync.mapping.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

// Preview Before/After lấy từ batch THẬT gần nhất (không bịa số liệu).
public record PreviewResponse(
        @JsonProperty("business_date") String businessDate,
        @JsonProperty("batch_id") String batchId,
        @JsonProperty("rows") List<PreviewRow> rows) {
}
