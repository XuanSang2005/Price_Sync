package price_sync.console;

import price_sync.console.dto.EventSummary;
import price_sync.console.dto.EventDetail;
import price_sync.console.dto.EventRecord;
import price_sync.console.dto.EventLog;
import price_sync.console.dto.EventFile;
import price_sync.console.dto.EventAttention;
import price_sync.console.dto.EventDashboard;
import price_sync.console.dto.EventHourBucket;
import price_sync.console.dto.EventPage;
import price_sync.console.dto.EventProgress;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.batch.BatchLogRepository;
import price_sync.domain.batch.BatchStatus;
import price_sync.domain.config.ConfigRepository;
import price_sync.domain.batch.PriceBatch;
import price_sync.domain.batch.PriceBatchRepository;
import price_sync.domain.record.PriceRecordRepository;
import price_sync.error.InvalidIdException;

@Service
public class EventService {
    private static final List<BatchStatus> ATTENTION_STATUSES = List.of(
            BatchStatus.FAILED, BatchStatus.PENDING_WRITE, BatchStatus.PARTIAL);

    private final BatchLogRepository batchLogRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final ConfigRepository configRepository;

    public EventService(PriceBatchRepository priceBatchRepository, PriceRecordRepository priceRecordRepository,
            BatchLogRepository batchLogRepository, ConfigRepository configRepository) {
        this.priceBatchRepository = priceBatchRepository;
        this.priceRecordRepository = priceRecordRepository;
        this.batchLogRepository = batchLogRepository;
        this.configRepository = configRepository;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public EventPage getEventsPage(int page, int size, BatchStatus status, String search) {
        PageRequest request = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Page<PriceBatch> result = priceBatchRepository.searchForConsole(status, escapeLike(search), request);
        return new EventPage(
                result.getContent().stream().map(this::toSummary).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public EventAttention getAttention(int limit) {
        PageRequest request = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "id"));
        List<EventSummary> events = priceBatchRepository.findByStatusIn(ATTENTION_STATUSES, request)
                .getContent().stream().map(this::toSummary).toList();
        return new EventAttention(priceBatchRepository.countByStatusIn(ATTENTION_STATUSES), events);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public EventDashboard getDashboard() {
        PageRequest recentRequest = PageRequest.of(0, 6, Sort.by(Sort.Direction.DESC, "id"));
        List<EventSummary> recent = priceBatchRepository.findAll(recentRequest).getContent().stream()
                .map(this::toSummary).toList();
        EventAttention attention = getAttention(6);
        List<EventHourBucket> hourly = priceBatchRepository.countLast14Hours().stream()
                .map(row -> new EventHourBucket(row.getBucket(), row.getTotal()))
                .toList();
        return new EventDashboard(getMetrics(), recent, attention.count(), attention.events(), hourly);
    }

    public EventDetail getEventDetails(Long id) {
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InvalidIdException::new);
        List<EventRecord> records = priceRecordRepository.findByBatchId(batch.getId()).stream()
                .map(record -> new EventRecord(
                        record.getChangeId(),
                        record.getVersion(),
                        record.getItemId(),
                        record.getStoreIdOrZone(),
                        record.getPrice(),
                        record.getCurrency(),
                        record.getEffectiveStart(),
                        record.getEffectiveEnd(),
                        record.getChangeType(),
                        record.getValidationStatus(),
                        record.getSetAsideReason(),
                        record.getExtras()))
                .toList();
        return new EventDetail(batch.getId(), batch.getBatchId(), batch.getVersion(), batch.getStatus(),
                batch.getGeneratedAt(), batch.getRetryCount(), batch.isWriteRetryable(), batch.getOutputFile(), records);
    }

    public EventProgress getEventProgress(Long id) {
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InvalidIdException::new);
        return new EventProgress(batch.getId(), batch.getStatus(), batch.getRetryCount(),
                batch.isWriteRetryable(), batch.getOutputFile());
    }

    // Đọc THẬT nội dung file MNT đã ghi ra cho batch (không dựng lại ở UI).
    public EventFile getFile(Long id) {
        PriceBatch batch = priceBatchRepository.findById(id).orElseThrow(InvalidIdException::new);
        String fileName = batch.getOutputFile();
        if (fileName == null) {
            return new EventFile(null, false, null, "No file yet (batch not WRITTEN/PARTIAL).");
        }
        String dir = configRepository.findByConfigKey("xcenter_inbound_path")
                .map(c -> c.getConfigValue()).orElse("xcenter-inbound");
        Path path = Path.of(dir, fileName);
        try {
            if (!Files.exists(path)) {
                return new EventFile(fileName, false, null, "File not on disk (cleaned or replaced).");
            }
            return new EventFile(fileName, true, Files.readString(path), null);
        } catch (IOException e) {
            return new EventFile(fileName, false, null, "Cannot read file: " + e.getMessage());
        }
    }

    public Map<BatchStatus, Long> getMetrics() {
        Map<BatchStatus, Long> statusCount = new EnumMap<>(BatchStatus.class);
        priceBatchRepository.countByStatus().forEach(row -> statusCount.put(row.getStatus(), row.getTotal()));
        for (BatchStatus status : BatchStatus.values()) {
            statusCount.putIfAbsent(status, 0L);
        }
        return statusCount;
    }

    public List<EventLog> getLogs(Long batchId) {
        priceBatchRepository.findById(batchId).orElseThrow(InvalidIdException::new);
        return batchLogRepository.findByBatchIdOrderByCreatedAtAsc(batchId).stream()
                .map(l -> new EventLog(l.getStatus(), l.getNote(), l.getCreatedAt()))
                .toList();
    }

    private EventSummary toSummary(PriceBatch batch) {
        return new EventSummary(
                batch.getId(), batch.getBatchId(), batch.getVersion(), batch.getStatus(), batch.getGeneratedAt());
    }

    private String escapeLike(String search) {
        return (search == null ? "" : search.trim())
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
    }
}
