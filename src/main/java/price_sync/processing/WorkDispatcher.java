package price_sync.processing;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import price_sync.domain.PriceBatch;
import price_sync.domain.PriceBatchRepository;

@Component
public class WorkDispatcher {

    private static final Logger log = LoggerFactory.getLogger(WorkDispatcher.class);
    private final PriceBatchRepository priceBatchRepository;
    public WorkDispatcher(PriceBatchRepository priceBatchRepository){
        this.priceBatchRepository = priceBatchRepository;
    }
    
    @Scheduled(fixedDelay = 10_000)
    @Transactional
    public void poll(){
        log.info("Dispatcher thuc day, dang tim viec");
        Optional<PriceBatch> next = priceBatchRepository.findNextToClaim();
        if ((next.isEmpty())){
            log.info("khong co viec");
            return;
        }
        PriceBatch batch = next.get();
        log.info("Da nhan batch id={}, batch_id={}", batch.getId(), batch.getBatchId());
        batch.markProcessing();
    }

}
