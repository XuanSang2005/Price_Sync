package price_sync.error;

public class MappingConfigurationException extends RuntimeException {

    public MappingConfigurationException(String message) {
        super(message);
    }

    public MappingConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }

}
