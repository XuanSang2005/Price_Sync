package price_sync.console;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import price_sync.domain.batch.BatchLogRepository;
import price_sync.domain.batch.BatchStatus;
import price_sync.domain.batch.PriceBatch;
import price_sync.domain.batch.PriceBatchRepository;
import price_sync.domain.config.ConfigRepository;
import price_sync.domain.record.PriceRecordRepository;

class EventServiceTest {
    private final BatchLogRepository logRepository = mock(BatchLogRepository.class);
    private final PriceBatchRepository batchRepository = mock(PriceBatchRepository.class);
    private final PriceRecordRepository recordRepository = mock(PriceRecordRepository.class);
    private final ConfigRepository configRepository = mock(ConfigRepository.class);
    private EventService service;

    @BeforeEach
    void setUp() {
        service = new EventService(batchRepository, recordRepository, logRepository, configRepository);
    }

    @Test
    void returnsBoundedEventPageWithoutLoadingEveryBatch() {
        PriceBatch batch = batch(42L, "batch-42", BatchStatus.WRITTEN);
        when(batchRepository.searchForConsole(eq(BatchStatus.WRITTEN), eq("batch"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(batch), PageRequest.of(0, 50), 1));

        var page = service.getEventsPage(0, 50, BatchStatus.WRITTEN, " batch ");

        assertThat(page.totalItems()).isEqualTo(1);
        assertThat(page.items()).singleElement().satisfies(event -> {
            assertThat(event.id()).isEqualTo(42L);
            assertThat(event.batchId()).isEqualTo("batch-42");
            assertThat(event.status()).isEqualTo(BatchStatus.WRITTEN);
        });
    }

    @Test
    void escapesLikeWildcardsInOperatorSearch() {
        when(batchRepository.searchForConsole(eq(null), eq("batch!%!_!!"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.getEventsPage(0, 50, null, " batch%_! ");
    }

    @Test
    void metricsUseDatabaseAggregationAndFillMissingStatuses() {
        PriceBatchRepository.StatusCount failed = mock(PriceBatchRepository.StatusCount.class);
        when(failed.getStatus()).thenReturn(BatchStatus.FAILED);
        when(failed.getTotal()).thenReturn(3L);
        when(batchRepository.countByStatus()).thenReturn(List.of(failed));

        var metrics = service.getMetrics();

        assertThat(metrics.get(BatchStatus.FAILED)).isEqualTo(3L);
        assertThat(metrics.get(BatchStatus.WRITTEN)).isZero();
        assertThat(metrics).hasSize(BatchStatus.values().length);
    }

    @Test
    void attentionReturnsTotalAndOnlyTheRequestedSample() {
        PriceBatch failedBatch = batch(7L, "failed-7", BatchStatus.FAILED);
        when(batchRepository.findByStatusIn(anyCollection(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(failedBatch)));
        when(batchRepository.countByStatusIn(anyCollection())).thenReturn(12L);

        var attention = service.getAttention(6);

        assertThat(attention.count()).isEqualTo(12);
        assertThat(attention.events()).singleElement()
                .extracting(event -> event.batchId())
                .isEqualTo("failed-7");
    }

    private PriceBatch batch(long id, String batchId, BatchStatus status) {
        PriceBatch batch = mock(PriceBatch.class);
        when(batch.getId()).thenReturn(id);
        when(batch.getBatchId()).thenReturn(batchId);
        when(batch.getVersion()).thenReturn(1);
        when(batch.getStatus()).thenReturn(status);
        when(batch.getGeneratedAt()).thenReturn(OffsetDateTime.parse("2026-08-02T10:00:00+07:00"));
        return batch;
    }
}
