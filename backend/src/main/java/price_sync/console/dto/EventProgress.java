package price_sync.console.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import price_sync.domain.batch.BatchStatus;

/** Lightweight state used while the console polls a non-terminal event. */
public record EventProgress(
        Long id,
        BatchStatus status,
        @JsonProperty("retry_count") int retryCount,
        boolean retryable,
        @JsonProperty("output_file") String outputFile) {
}
