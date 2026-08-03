package price_sync.console.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

public record EventHourBucket(Instant hour, @JsonProperty("event_count") long eventCount) {
}
