package price_sync.console.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.batch.BatchStatus;

/** One coherent snapshot for the dashboard, avoiding several duplicate full-table requests. */
public record EventDashboard(
        Map<BatchStatus, Long> metrics,
        @JsonProperty("recent_events") List<EventSummary> recentEvents,
        @JsonProperty("attention_count") long attentionCount,
        @JsonProperty("attention_events") List<EventSummary> attentionEvents,
        @JsonProperty("hourly_events") List<EventHourBucket> hourlyEvents) {
}
