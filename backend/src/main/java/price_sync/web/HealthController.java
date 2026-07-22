package price_sync.web;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.batch.PriceBatchRepository;

// Kiểm tra sức khoẻ THẬT: API sống + DB đọc được (một query đếm nhẹ).
// Cũng trả version/environment từ CONFIG (không bịa chuỗi trong FE) cho header/footer console.
@RestController
public class HealthController {
    private final PriceBatchRepository priceBatchRepository;
    private final String version;
    private final String environment;

    public HealthController(PriceBatchRepository priceBatchRepository,
            @Value("${app.version:dev}") String version,
            @Value("${app.environment:LOCAL}") String environment) {
        this.priceBatchRepository = priceBatchRepository;
        this.version = version;
        this.environment = environment;
    }

    @GetMapping("/api/v1/health")
    public Map<String, Object> health() {
        Map<String, Object> out = new LinkedHashMap<>();
        boolean dbOk;
        try {
            priceBatchRepository.count();
            dbOk = true;
        } catch (Exception e) {
            dbOk = false;
        }
        out.put("status", dbOk ? "ok" : "degraded");
        out.put("api", true);
        out.put("db", dbOk);
        out.put("version", version);
        out.put("environment", environment);
        out.put("checked_at", OffsetDateTime.now().toString());
        return out;
    }
}
