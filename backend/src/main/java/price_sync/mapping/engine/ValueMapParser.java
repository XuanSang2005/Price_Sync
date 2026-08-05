package price_sync.mapping.engine;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import price_sync.error.MappingConfigurationException;

@Component
public class ValueMapParser {

    private final ObjectMapper objectMapper;

    public ValueMapParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, String> parse(String json) {
        if (json == null || json.isBlank()) {
            throw new MappingConfigurationException("VALUE_MAP rule_value is required");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(json);
        } catch (JsonProcessingException exception) {
            throw new MappingConfigurationException(
                    "VALUE_MAP rule_value must be valid JSON",
                    exception);
        }

        if (!root.isObject()) {
            throw new MappingConfigurationException(
                    "VALUE_MAP rule_value must be a JSON object");
        }

        Map<String, String> parsed = new LinkedHashMap<>();

        for (Map.Entry<String, JsonNode> field : root.properties()) {
            String key = field.getKey();
            JsonNode valueNode = field.getValue();

            if (key.isBlank()) {
                throw new MappingConfigurationException(
                        "VALUE_MAP keys must not be blank");
            }

            if (!valueNode.isTextual()) {
                throw new MappingConfigurationException(
                        "VALUE_MAP value for '" + key + "' must be a string");
            }

            String value = valueNode.textValue();

            if (value.isBlank()) {
                throw new MappingConfigurationException(
                        "VALUE_MAP value for '" + key + "' must not be blank");
            }

            parsed.put(key, value);
        }

        if (parsed.isEmpty()) {
            throw new MappingConfigurationException(
                    "VALUE_MAP rule_value must not be an empty object");
        }

        return parsed;
    }
}
