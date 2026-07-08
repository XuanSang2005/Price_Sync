package price_sync.processing;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;
import price_sync.domain.PriceRecord;
import price_sync.domain.PriceRecordRepository;

@Component
public class BatchProcessor {
    private static final Logger log = LoggerFactory.getLogger(BatchProcessor.class);
    private final PriceRecordRepository priceRecordRepository;
    private final PriceBatchRepository priceBatchRepository;
    private final Validator validator;

    public BatchProcessor(PriceRecordRepository priceRecordRepository, Validator validator,
            PriceBatchRepository priceBatchRepository) {
        this.priceRecordRepository = priceRecordRepository;
        this.validator = validator;
        this.priceBatchRepository = priceBatchRepository;
    }

    @Transactional
    public Optional<PriceBatch> claimNext(String owner) {
        Optional<PriceBatch> next = priceBatchRepository.findNextToClaim();
        if (next.isEmpty()) {
            return next;
        }
        PriceBatch batch = next.get();
        batch.markProcessing(owner);
        return next;
    }

    @Transactional
    public void validateBatch(Long batchId) {
        int valid = 0, setAside = 0;
        List<PriceRecord> records = priceRecordRepository.findByBatchId(batchId);
        for (PriceRecord record : records) {
            Optional<String> reason = validator.validate(record);
            if (reason.isEmpty()) {
                record.markValid();
                valid++;
            } else {
                record.setAside(reason.get());
                setAside++;
            }
        }
        double failRate = (double) setAside / (valid + setAside);
        if (failRate > 0.2 || valid == 0) {
            priceBatchRepository.findById(batchId).get().markFail();
            log.warn("Batch {} BI HUY: {}/{} records set aside (ti le hong {}%)",
                    batchId, setAside, records.size(), Math.round(failRate * 100));
        } else {
            log.info("Batch {} qua kiem dinh: {} VALID, {} SET_ASIDE - san sang cho Mapper",
                    batchId, valid, setAside);
        }
    }

}
