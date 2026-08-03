package price_sync.processing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import price_sync.config.ConfigKeys;
import price_sync.domain.batch.PriceBatch;
import price_sync.domain.config.Config;
import price_sync.domain.config.ConfigRepository;

class AlertServiceTest {
    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final ConfigRepository configRepository = mock(ConfigRepository.class);

    @Test
    void readsAddressesAgainForEveryAlert() {
        Config firstSender = config("first-sender@example.com");
        Config secondSender = config("second-sender@example.com");
        Config firstRecipient = config("first-recipient@example.com");
        Config secondRecipient = config("second-recipient@example.com");
        when(configRepository.findByConfigKey(ConfigKeys.ALERT_EMAIL_FROM))
                .thenReturn(Optional.of(firstSender))
                .thenReturn(Optional.of(secondSender));
        when(configRepository.findByConfigKey(ConfigKeys.ALERT_EMAIL_TO))
                .thenReturn(Optional.of(firstRecipient))
                .thenReturn(Optional.of(secondRecipient));
        AlertService service = serviceWithFallbacks();

        service.batchFailed(batch("batch-1"), "first failure");
        service.batchFailed(batch("batch-2"), "second failure");

        ArgumentCaptor<SimpleMailMessage> messages = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(messages.capture());
        assertThat(messages.getAllValues().get(0).getFrom()).isEqualTo("first-sender@example.com");
        assertThat(messages.getAllValues().get(0).getTo()).containsExactly("first-recipient@example.com");
        assertThat(messages.getAllValues().get(1).getFrom()).isEqualTo("second-sender@example.com");
        assertThat(messages.getAllValues().get(1).getTo()).containsExactly("second-recipient@example.com");
    }

    @Test
    void fallsBackWhenDatabaseValueIsInvalidOrLookupFails() {
        Config invalidSender = config("invalid address");
        when(configRepository.findByConfigKey(ConfigKeys.ALERT_EMAIL_FROM))
                .thenReturn(Optional.of(invalidSender));
        when(configRepository.findByConfigKey(ConfigKeys.ALERT_EMAIL_TO))
                .thenThrow(new IllegalStateException("database unavailable"));
        AlertService service = serviceWithFallbacks();

        service.batchFailed(batch("batch-1"), "failure");

        ArgumentCaptor<SimpleMailMessage> message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().getFrom()).isEqualTo("fallback-sender@example.com");
        assertThat(message.getValue().getTo()).containsExactly("fallback-recipient@example.com");
    }

    @Test
    void mailFailureDoesNotEscapeBatchFailureHandling() {
        when(configRepository.findByConfigKey(any())).thenReturn(Optional.empty());
        org.mockito.Mockito.doThrow(new IllegalStateException("smtp unavailable"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        serviceWithFallbacks().batchFailed(batch("batch-1"), "failure");

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void onlyWriteFailuresIncludeTheRedriveAction() {
        when(configRepository.findByConfigKey(any())).thenReturn(Optional.empty());
        AlertService service = serviceWithFallbacks();
        PriceBatch validationFailure = batch("validation-failure");
        validationFailure.markFail();
        PriceBatch writeFailure = batch("write-failure");
        writeFailure.markPendingWrite();
        writeFailure.markPendingWrite();

        service.batchFailed(validationFailure, "validation");
        service.batchFailed(writeFailure, "write");

        ArgumentCaptor<SimpleMailMessage> messages = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(messages.capture());
        assertThat(messages.getAllValues().get(0).getText()).doesNotContain("Re-drive write");
        assertThat(messages.getAllValues().get(1).getText()).contains("Re-drive write");
    }

    private AlertService serviceWithFallbacks() {
        return new AlertService(mailSender, configRepository,
                "fallback-recipient@example.com", "fallback-sender@example.com");
    }

    private static Config config(String value) {
        Config config = mock(Config.class);
        when(config.getConfigValue()).thenReturn(value);
        return config;
    }

    private static PriceBatch batch(String batchId) {
        return new PriceBatch(batchId, 1, OffsetDateTime.now());
    }
}
