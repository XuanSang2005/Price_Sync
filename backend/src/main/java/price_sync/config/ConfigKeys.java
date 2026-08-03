package price_sync.config;

/**
 * Keys stored in the {@code config} table.
 *
 * Keeping shared keys here avoids small spelling differences between the API,
 * migrations and runtime consumers such as {@code AlertService}.
 */
public final class ConfigKeys {
    public static final String ABORT_THRESHOLD = "abort_threshold";
    public static final String ALERT_EMAIL_FROM = "alert_email_from";
    public static final String ALERT_EMAIL_TO = "alert_email_to";
    public static final String FILENAME_PATTERN = "filename_pattern";
    public static final String IP_ALLOWLIST = "ip_allowlist";
    public static final String REPLAY_SKEW_MIN = "replay_skew_min";
    public static final String XCENTER_INBOUND_PATH = "xcenter_inbound_path";

    private ConfigKeys() {
    }
}
