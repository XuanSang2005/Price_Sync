package price_sync.intake;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import price_sync.processing.BatchProcessor;

@RestController
public class RetryIntakeController {
    private final BatchProcessor batchProcessor;

    public RetryIntakeController(BatchProcessor batchProcessor){
        this.batchProcessor = batchProcessor;
    }

    @PostMapping("/api/v1/events/{id}/retry")
    public ResponseEntity<String>receive(@PathVariable Long id){
        if (batchProcessor.retry(id)){
            return ResponseEntity.accepted().body("Receive");
        }
        return ResponseEntity.ok("Done");
    }

}
