package price_sync.mapping;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import price_sync.mapping.dto.MappingCreateRequest;
import price_sync.mapping.dto.MappingMeta;
import price_sync.mapping.dto.MappingResponse;
import price_sync.mapping.dto.PreviewResponse;

@RestController
public class MappingController {
    private final MappingService mappingService;

    public MappingController(MappingService mappingService) {
        this.mappingService = mappingService;
    }

    @GetMapping("/api/v1/mappings")
    public List<MappingResponse> list() {
        return mappingService.getAll();
    }

    // Metadata cho UI (source fields động + record/rule/standard) — để FE không hardcode danh sách
    @GetMapping("/api/v1/mappings/meta")
    public MappingMeta meta() {
        return mappingService.meta();
    }

    // Preview Before/After lấy từ batch thật gần nhất
    @GetMapping("/api/v1/mappings/preview")
    public PreviewResponse preview() {
        return mappingService.preview();
    }

    // Bulk-replace toàn bộ luật của một record_type (Save từ UI kéo-thả)
    @PutMapping("/api/v1/mappings/{recordType}")
    public ResponseEntity<String> replace(@PathVariable String recordType,
            @RequestBody List<MappingCreateRequest> body) {
        mappingService.replace(recordType, body);
        return ResponseEntity.ok("Replaced");
    }

}
