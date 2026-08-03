package price_sync.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ConfigValueValidatorTest {

    @Test
    void normalizesValuesUsedByNumericRuntimeConsumers() {
        assertThat(ConfigValueValidator.normalizeAndValidate(ConfigKeys.ABORT_THRESHOLD, " 0.20 "))
                .isEqualTo("0.2");
        assertThat(ConfigValueValidator.normalizeAndValidate(ConfigKeys.REPLAY_SKEW_MIN, "005"))
                .isEqualTo("5");
    }

    @Test
    void rejectsInvalidNumericValues() {
        assertInvalid(ConfigKeys.ABORT_THRESHOLD, "1.01", "between 0 and 1");
        assertInvalid(ConfigKeys.ABORT_THRESHOLD, "not-a-number", "number from 0 to 1");
        assertInvalid(ConfigKeys.REPLAY_SKEW_MIN, "1.5", "integer");
        assertInvalid(ConfigKeys.REPLAY_SKEW_MIN, "-1", "integer");
        assertInvalid(ConfigKeys.REPLAY_SKEW_MIN, "999999999999999999999999", "too large");
    }

    @Test
    void acceptsAndNormalizesIpv4AndIpv6Allowlist() {
        String normalized = ConfigValueValidator.normalizeAndValidate(
                ConfigKeys.IP_ALLOWLIST,
                " 127.0.0.1, 0:0:0:0:0:0:0:1,127.0.0.1 ");

        assertThat(normalized).isEqualTo("127.0.0.1,0:0:0:0:0:0:0:1");
    }

    @Test
    void rejectsHostnamesAndMalformedIpAddresses() {
        assertInvalid(ConfigKeys.IP_ALLOWLIST, "localhost", "IPv4 or IPv6");
        assertInvalid(ConfigKeys.IP_ALLOWLIST, "127.0.0.1,", "IPv4 or IPv6");
        assertInvalid(ConfigKeys.IP_ALLOWLIST, "999.0.0.1", "IPv4 or IPv6");
    }

    @Test
    void validatesOutputPathAndFilenameSeparately() {
        assertThat(ConfigValueValidator.normalizeAndValidate(
                ConfigKeys.XCENTER_INBOUND_PATH, " /var/xcenter/inbound "))
                .isEqualTo("/var/xcenter/inbound");
        assertThat(ConfigValueValidator.normalizeAndValidate(
                ConfigKeys.FILENAME_PATTERN, "prices_<batch_id>_<ts>.mnt"))
                .isEqualTo("prices_<batch_id>_<ts>.mnt");

        assertInvalid(ConfigKeys.XCENTER_INBOUND_PATH, "/", "filesystem root");
        assertInvalid(ConfigKeys.XCENTER_INBOUND_PATH, "../outside", "'..'");
        assertInvalid(ConfigKeys.FILENAME_PATTERN, "nested/prices_<ts>.mnt", "not a path");
        assertInvalid(ConfigKeys.FILENAME_PATTERN, "prices_<unknown>_<ts>.mnt", "unsupported placeholder");
        assertInvalid(ConfigKeys.FILENAME_PATTERN, "prices_<batch_id>.mnt", "contain <ts>");
    }

    @Test
    void validatesPlainEmailAddressesOnly() {
        assertThat(ConfigValueValidator.normalizeAndValidate(
                ConfigKeys.ALERT_EMAIL_FROM, " price-sync@example.com "))
                .isEqualTo("price-sync@example.com");
        assertThat(ConfigValueValidator.isValidEmail("ops@example.com")).isTrue();
        assertThat(ConfigValueValidator.isValidEmail("Ops <ops@example.com>")).isFalse();
        assertThat(ConfigValueValidator.isValidEmail("ops..team@example.com")).isFalse();

        assertInvalid(ConfigKeys.ALERT_EMAIL_TO, "not-an-email", "valid email address");
        assertInvalid(ConfigKeys.ALERT_EMAIL_TO, "ops@example.com\r\nBcc: victim@example.com",
                "control characters");
    }

    private static void assertInvalid(String key, String value, String expectedMessage) {
        assertThatThrownBy(() -> ConfigValueValidator.normalizeAndValidate(key, value))
                .isInstanceOf(InvalidConfigValueException.class)
                .hasMessageContaining(expectedMessage);
    }
}
