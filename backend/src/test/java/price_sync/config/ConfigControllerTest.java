package price_sync.config;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ConfigControllerTest {
    private final ConfigService service = mock(ConfigService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ConfigController(service)).build();
    }

    @Test
    void validationErrorReturnsReadableJson() throws Exception {
        doThrow(new InvalidConfigValueException(
                "Invalid value for 'abort_threshold': must be between 0 and 1"))
                .when(service).update(ConfigKeys.ABORT_THRESHOLD, "2");

        mockMvc.perform(put("/api/v1/config/{key}", ConfigKeys.ABORT_THRESHOLD)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"config_value\":\"2\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_CONFIG_VALUE"))
                .andExpect(jsonPath("$.message").value(
                        "Invalid value for 'abort_threshold': must be between 0 and 1"));
    }

    @Test
    void missingKeyReturnsReadableJson() throws Exception {
        doThrow(new ConfigNotFoundException("missing"))
                .when(service).update("missing", "value");

        mockMvc.perform(put("/api/v1/config/missing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"config_value\":\"value\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("CONFIG_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Config key 'missing' does not exist"));
    }
}
