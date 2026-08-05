package price_sync.mapping;

import org.springframework.stereotype.Component;

import price_sync.error.InvalidMappingRuleException;
import price_sync.error.MappingConfigurationException;
import price_sync.mapping.dto.MappingCreateRequest;
import price_sync.mapping.engine.ValueMapParser;

@Component
public class MappingRuleValidator {
    private static final String VALUE_MAP = "VALUE_MAP";

    private final ValueMapParser valueMapParser;

    public MappingRuleValidator(ValueMapParser valueMapParser) {
        this.valueMapParser = valueMapParser;
    }

    public void validate(MappingCreateRequest request) {
        if (!VALUE_MAP.equals(request.ruleType())) {
            return;
        }

        try {
            valueMapParser.parse(request.ruleValue());
        } catch (MappingConfigurationException exception) {
            throw new InvalidMappingRuleException(exception.getMessage(), exception);
        }
    }
}
