package price_sync.config;

/** Raised when the requested key is not present in the config table. */
public class ConfigNotFoundException extends RuntimeException {
    public ConfigNotFoundException(String key) {
        super("Config key '" + key + "' does not exist");
    }
}
