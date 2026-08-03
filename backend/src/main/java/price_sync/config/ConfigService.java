package price_sync.config;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import price_sync.config.dto.ConfigResponse;
import price_sync.domain.config.Config;
import price_sync.domain.config.ConfigRepository;

@Service
public class ConfigService {
    private final ConfigRepository configRepository;

    public ConfigService(ConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Transactional(readOnly = true)
    public List<ConfigResponse> getAll() {
        return configRepository.findAll().stream()
                .map(config -> new ConfigResponse(config.getConfigKey(), config.getConfigValue()))
                .toList();
    }

    @Transactional
    public void update(String key, String newValue) {
        Config config = configRepository.findByConfigKey(key)
                .orElseThrow(() -> new ConfigNotFoundException(key));
        String normalizedValue = ConfigValueValidator.normalizeAndValidate(key, newValue);
        config.updateValue(normalizedValue);
    }
}
