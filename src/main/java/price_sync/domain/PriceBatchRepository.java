package price_sync.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PriceBatchRepository extends JpaRepository<PriceBatch, Long> {
    
}
