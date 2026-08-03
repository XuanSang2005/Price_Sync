package price_sync.config;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import price_sync.config.dto.ConfigResponse;
import price_sync.config.dto.ConfigUpdateRequest;

@RestController
public class ConfigController {
    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/api/v1/config")
    public List<ConfigResponse> getConfig() {
        return configService.getAll();
    }

    @PutMapping("/api/v1/config/{key}")
    public ResponseEntity<String> updateConfig(@PathVariable String key, @RequestBody ConfigUpdateRequest body) {
        configService.update(key, body.configValue());
        return ResponseEntity.ok("Done");
    }

    @ExceptionHandler(InvalidConfigValueException.class)
    public ResponseEntity<ConfigErrorResponse> invalidValue(InvalidConfigValueException exception) {
        return ResponseEntity.badRequest()
                .body(new ConfigErrorResponse("INVALID_CONFIG_VALUE", exception.getMessage()));
    }

    @ExceptionHandler(ConfigNotFoundException.class)
    public ResponseEntity<ConfigErrorResponse> missingKey(ConfigNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ConfigErrorResponse("CONFIG_NOT_FOUND", exception.getMessage()));
    }

    public record ConfigErrorResponse(String error, String message) {
    }
}
