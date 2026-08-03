package price_sync.console.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

/** A bounded page for the operator console event list. */
public record EventPage(
        List<EventSummary> items,
        int page,
        int size,
        @JsonProperty("total_items") long totalItems,
        @JsonProperty("total_pages") int totalPages) {
}
