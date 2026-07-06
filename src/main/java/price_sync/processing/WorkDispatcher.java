package price_sync.processing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WorkDispatcher {

    private static final Logger log = LoggerFactory.getLogger(WorkDispatcher.class);
    
    @Scheduled(fixedDelay = 10_000)
    public void poll(){
        log.info("Dispatcher thuc day, dang tim viec");
    }

}
