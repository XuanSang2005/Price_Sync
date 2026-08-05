package price_sync.error;

import java.time.OffsetDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(DuplicateBatchException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateBatchException e){
        ErrorResponse body = new ErrorResponse("BATCH_DUPLICATE", e.getMessage(), e.getBatchId(), e.getVersion(), OffsetDateTime.now());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(InvalidMappingRuleException.class)
    public ResponseEntity<MappingErrorResponse> handleInvalidMapping(InvalidMappingRuleException e) {
        MappingErrorResponse body = new MappingErrorResponse("INVALID_MAPPING_RULE", e.getMessage());
        return ResponseEntity.badRequest().body(body);
    }
}

