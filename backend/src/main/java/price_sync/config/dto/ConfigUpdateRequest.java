package price_sync.config.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ConfigUpdateRequest(@JsonProperty("config_value") String configValue) {}
