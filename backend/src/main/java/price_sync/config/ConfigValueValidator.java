package price_sync.config;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Normalizes and validates values before they enter the config table.
 *
 * Several request filters and batch workers consume these values directly, so
 * rejecting unusable values here prevents a successful save from becoming a
 * delayed production failure.
 */
public final class ConfigValueValidator {
    private static final int MAX_GENERIC_LENGTH = 4_096;
    private static final BigInteger MAX_REPLAY_SKEW_MINUTES =
            BigInteger.valueOf(Long.MAX_VALUE).divide(BigInteger.valueOf(60));
    private static final Pattern EMAIL = Pattern.compile(
            "^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern IPV6_CHARACTERS = Pattern.compile("^[0-9A-Fa-f:.]+$");
    private static final Pattern PLACEHOLDER = Pattern.compile("<([^<>]+)>");
    private static final Set<String> ALLOWED_FILENAME_PLACEHOLDERS = Set.of("batch_id", "version", "ts");

    private ConfigValueValidator() {
    }

    public static String normalizeAndValidate(String key, String rawValue) {
        String value = requireUsableText(key, rawValue);
        return switch (key) {
            case ConfigKeys.ABORT_THRESHOLD -> validateAbortThreshold(value);
            case ConfigKeys.ALERT_EMAIL_FROM, ConfigKeys.ALERT_EMAIL_TO -> validateEmail(key, value);
            case ConfigKeys.FILENAME_PATTERN -> validateFilenamePattern(value);
            case ConfigKeys.IP_ALLOWLIST -> validateAllowlist(value);
            case ConfigKeys.REPLAY_SKEW_MIN -> validateReplaySkew(value);
            case ConfigKeys.XCENTER_INBOUND_PATH -> validateInboundPath(value);
            default -> value;
        };
    }

    /** Used by AlertService to distrust values that may have been changed outside the API. */
    public static boolean isValidEmail(String value) {
        if (value == null) {
            return false;
        }
        String candidate = value.trim();
        if (candidate.length() > 254 || !EMAIL.matcher(candidate).matches()) {
            return false;
        }
        int separator = candidate.lastIndexOf('@');
        if (separator <= 0 || separator > 64) {
            return false;
        }
        String localPart = candidate.substring(0, separator);
        return !localPart.startsWith(".") && !localPart.endsWith(".") && !localPart.contains("..");
    }

    private static String requireUsableText(String key, String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            throw invalid(key, "value is required");
        }
        String value = rawValue.trim();
        if (value.length() > MAX_GENERIC_LENGTH) {
            throw invalid(key, "value is too long");
        }
        if (value.chars().anyMatch(Character::isISOControl)) {
            throw invalid(key, "control characters are not allowed");
        }
        return value;
    }

    private static String validateAbortThreshold(String value) {
        if (!value.matches("[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)")) {
            throw invalid(ConfigKeys.ABORT_THRESHOLD, "must be a number from 0 to 1");
        }
        final BigDecimal threshold;
        try {
            threshold = new BigDecimal(value);
        } catch (NumberFormatException exception) {
            throw invalid(ConfigKeys.ABORT_THRESHOLD, "must be a number from 0 to 1");
        }
        if (threshold.compareTo(BigDecimal.ZERO) < 0 || threshold.compareTo(BigDecimal.ONE) > 0) {
            throw invalid(ConfigKeys.ABORT_THRESHOLD, "must be between 0 and 1");
        }
        return threshold.stripTrailingZeros().toPlainString();
    }

    private static String validateEmail(String key, String value) {
        if (!isValidEmail(value)) {
            throw invalid(key, "must be a valid email address");
        }
        return value;
    }

    private static String validateReplaySkew(String value) {
        if (!value.matches("\\d+")) {
            throw invalid(ConfigKeys.REPLAY_SKEW_MIN, "must be an integer greater than or equal to 0");
        }
        BigInteger minutes = new BigInteger(value);
        if (minutes.compareTo(MAX_REPLAY_SKEW_MINUTES) > 0) {
            throw invalid(ConfigKeys.REPLAY_SKEW_MIN, "is too large");
        }
        return minutes.toString();
    }

    private static String validateAllowlist(String value) {
        String[] entries = value.split(",", -1);
        if (entries.length > 100) {
            throw invalid(ConfigKeys.IP_ALLOWLIST, "supports at most 100 IP addresses");
        }
        for (String entry : entries) {
            if (!isIpLiteral(entry.trim())) {
                throw invalid(ConfigKeys.IP_ALLOWLIST,
                        "must be a comma-separated list of IPv4 or IPv6 addresses");
            }
        }
        return Arrays.stream(entries).map(String::trim).distinct().collect(Collectors.joining(","));
    }

    private static boolean isIpLiteral(String value) {
        if (value.isEmpty()) {
            return false;
        }
        if (!value.contains(":")) {
            String[] octets = value.split("\\.", -1);
            if (octets.length != 4) {
                return false;
            }
            for (String octet : octets) {
                if (!octet.matches("\\d{1,3}")) {
                    return false;
                }
                int number = Integer.parseInt(octet);
                if (number > 255 || (octet.length() > 1 && octet.startsWith("0"))) {
                    return false;
                }
            }
            return true;
        }
        if (!IPV6_CHARACTERS.matcher(value).matches()) {
            return false;
        }
        try {
            return InetAddress.getByName(value) instanceof Inet6Address;
        } catch (UnknownHostException exception) {
            return false;
        }
    }

    private static String validateInboundPath(String value) {
        final Path path;
        try {
            path = Path.of(value);
        } catch (InvalidPathException exception) {
            throw invalid(ConfigKeys.XCENTER_INBOUND_PATH, "must be a valid filesystem path");
        }
        if (path.getNameCount() == 0) {
            throw invalid(ConfigKeys.XCENTER_INBOUND_PATH, "cannot be a filesystem root");
        }
        for (Path segment : path) {
            if (segment.toString().equals("..")) {
                throw invalid(ConfigKeys.XCENTER_INBOUND_PATH, "cannot contain '..' path segments");
            }
        }
        return value;
    }

    private static String validateFilenamePattern(String value) {
        if (value.length() > 255) {
            throw invalid(ConfigKeys.FILENAME_PATTERN, "must be 255 characters or fewer");
        }
        if (value.contains("/") || value.contains("\\")) {
            throw invalid(ConfigKeys.FILENAME_PATTERN, "must be a file name, not a path");
        }
        if (!value.endsWith(".mnt") || !value.contains("<ts>")) {
            throw invalid(ConfigKeys.FILENAME_PATTERN, "must end with .mnt and contain <ts>");
        }

        Matcher matcher = PLACEHOLDER.matcher(value);
        while (matcher.find()) {
            if (!ALLOWED_FILENAME_PLACEHOLDERS.contains(matcher.group(1))) {
                throw invalid(ConfigKeys.FILENAME_PATTERN,
                        "contains unsupported placeholder <" + matcher.group(1) + ">");
            }
        }
        String withoutKnownPlaceholders = value
                .replace("<batch_id>", "")
                .replace("<version>", "")
                .replace("<ts>", "");
        if (withoutKnownPlaceholders.contains("<") || withoutKnownPlaceholders.contains(">")) {
            throw invalid(ConfigKeys.FILENAME_PATTERN, "contains a malformed placeholder");
        }
        return value;
    }

    private static InvalidConfigValueException invalid(String key, String detail) {
        return new InvalidConfigValueException("Invalid value for '" + key + "': " + detail);
    }
}
