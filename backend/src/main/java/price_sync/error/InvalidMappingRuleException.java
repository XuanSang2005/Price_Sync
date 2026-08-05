package price_sync.error;


public class InvalidMappingRuleException extends RuntimeException {
    public InvalidMappingRuleException(String message, Throwable cause) {
        super(message, cause);
    }
}
