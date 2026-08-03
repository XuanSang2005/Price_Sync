package price_sync.processing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import price_sync.config.ConfigKeys;
import price_sync.config.ConfigValueValidator;
import price_sync.domain.batch.PriceBatch;
import price_sync.domain.config.ConfigRepository;

@Service
public class AlertService {
    private static final Logger log = LoggerFactory.getLogger(AlertService.class);
    private static final String SAFE_FROM = "price-sync@localhost";
    private static final String SAFE_TO = "ops@localhost";

    private final JavaMailSender mailSender;
    private final ConfigRepository configRepository;
    private final String fallbackAlertTo;
    private final String fallbackAlertFrom;

    public AlertService(JavaMailSender mailSender,
            ConfigRepository configRepository,
            @Value("${app.alert.to:sangbom2005@gmail.com}") String alertTo,
            @Value("${app.alert.from:sangbom2005@gmail.com}") String alertFrom) {
        this.mailSender = mailSender;
        this.configRepository = configRepository;
        this.fallbackAlertTo = safeFallback(alertTo, SAFE_TO, "app.alert.to");
        this.fallbackAlertFrom = safeFallback(alertFrom, SAFE_FROM, "app.alert.from");
    }

    public void batchFailed(PriceBatch batch, String reason) {
        try {
            // Resolve on every alert so a Connections-page edit is effective immediately.
            String alertFrom = resolveEmail(ConfigKeys.ALERT_EMAIL_FROM, fallbackAlertFrom);
            String alertTo = resolveEmail(ConfigKeys.ALERT_EMAIL_TO, fallbackAlertTo);

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(alertFrom);
            msg.setTo(alertTo);
            msg.setSubject("[Price Sync] Batch FAILED: " + batch.getBatchId());
            String operatorAction = batch.isWriteRetryable()
                    ? "\nRe-drive write: POST /api/v1/events/" + batch.getId() + "/retry"
                    : "\nReview the rejected records and validation reason in the console.";
            msg.setText("Batch " + batch.getBatchId() + " (id=" + batch.getId() + ", version=" + batch.getVersion()
                    + ") da FAILED.\n"
                    + "Ly do: " + reason + "\n"
                    + "Can nguoi xu ly." + operatorAction);
            mailSender.send(msg);
            log.info("Da gui alert email FAILED cho batch {}", batch.getId());
        } catch (Exception e) {
            log.error("Gui alert email that bai (batch {}): {}", batch.getId(), e.getMessage());
        }
    }

    private String resolveEmail(String key, String fallback) {
        try {
            return configRepository.findByConfigKey(key)
                    .map(config -> config.getConfigValue().trim())
                    .filter(value -> {
                        boolean valid = ConfigValueValidator.isValidEmail(value);
                        if (!valid) {
                            log.warn("Config {} is not a valid email; using application fallback", key);
                        }
                        return valid;
                    })
                    .orElse(fallback);
        } catch (RuntimeException exception) {
            // A failed alert lookup must not interfere with batch failure handling.
            log.warn("Cannot read config {}; using application fallback: {}", key, exception.getMessage());
            return fallback;
        }
    }

    private static String safeFallback(String configured, String safeDefault, String propertyName) {
        if (ConfigValueValidator.isValidEmail(configured)) {
            return configured.trim();
        }
        log.warn("Property {} is not a valid email; using {}", propertyName, safeDefault);
        return safeDefault;
    }
}
