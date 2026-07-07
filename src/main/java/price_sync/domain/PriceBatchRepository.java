package price_sync.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;

public interface PriceBatchRepository extends JpaRepository<PriceBatch, Long> {
    @Query(value = """
            SELECT * FROM price_batch
    WHERE status = 'RECEIVED'
    ORDER BY
    id LIMIT 1
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<PriceBatch> findNextToClaim();
}
