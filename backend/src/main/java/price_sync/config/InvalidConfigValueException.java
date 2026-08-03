package price_sync.config;

/** Raised when a config value cannot be used safely by its runtime consumer. */
public class InvalidConfigValueException extends RuntimeException {
    public InvalidConfigValueException(String message) {
        super(message);
    }
}
