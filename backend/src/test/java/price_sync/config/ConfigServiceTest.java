package price_sync.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import price_sync.domain.config.Config;
import price_sync.domain.config.ConfigRepository;

class ConfigServiceTest {
    private final ConfigRepository repository = mock(ConfigRepository.class);
    private final ConfigService service = new ConfigService(repository);

    @Test
    void validatesAndNormalizesBeforeUpdatingEntity() {
        Config config = mock(Config.class);
        when(repository.findByConfigKey(ConfigKeys.IP_ALLOWLIST)).thenReturn(Optional.of(config));

        service.update(ConfigKeys.IP_ALLOWLIST, "127.0.0.1, 0:0:0:0:0:0:0:1");

        verify(config).updateValue("127.0.0.1,0:0:0:0:0:0:0:1");
    }

    @Test
    void invalidValueNeverMutatesEntity() {
        Config config = mock(Config.class);
        when(repository.findByConfigKey(ConfigKeys.ABORT_THRESHOLD)).thenReturn(Optional.of(config));

        assertThatThrownBy(() -> service.update(ConfigKeys.ABORT_THRESHOLD, "two"))
                .isInstanceOf(InvalidConfigValueException.class)
                .hasMessageContaining(ConfigKeys.ABORT_THRESHOLD);
        verify(config, never()).updateValue(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void missingKeyHasClearError() {
        when(repository.findByConfigKey("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update("missing", "value"))
                .isInstanceOf(ConfigNotFoundException.class)
                .hasMessage("Config key 'missing' does not exist");
    }
}
