package price_sync.console.dto;

import java.util.List;

/** Current operator-attention count plus a small recent sample for the header. */
public record EventAttention(long count, List<EventSummary> events) {
}
