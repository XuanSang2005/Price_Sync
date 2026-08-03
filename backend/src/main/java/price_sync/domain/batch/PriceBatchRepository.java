package price_sync.domain.batch;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface PriceBatchRepository extends JpaRepository<PriceBatch, Long> {
    interface StatusCount {
        BatchStatus getStatus();
        long getTotal();
    }

    interface HourCount {
        Instant getBucket();
        long getTotal();
    }

    @Query("""
            SELECT b FROM PriceBatch b
            WHERE (:status IS NULL OR b.status = :status)
              AND (:search = '' OR LOWER(b.batchId) LIKE LOWER(CONCAT('%', :search, '%')) ESCAPE '!')
            """)
    Page<PriceBatch> searchForConsole(
            @Param("status") BatchStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM PriceBatch b WHERE b.id = :id")
    Optional<PriceBatch> findByIdForUpdate(@Param("id") Long id);

    Page<PriceBatch> findByStatusIn(Collection<BatchStatus> statuses, Pageable pageable);

    long countByStatusIn(Collection<BatchStatus> statuses);

    @Query("SELECT b.status AS status, COUNT(b) AS total FROM PriceBatch b GROUP BY b.status")
    List<StatusCount> countByStatus();

    /** PostgreSQL generates all 14 clock-hour buckets, including hours with zero events. */
    @Query(value = """
            WITH hours AS (
                SELECT generate_series(
                    date_trunc('hour', now()) - interval '13 hours',
                    date_trunc('hour', now()),
                    interval '1 hour'
                ) AS bucket
            )
            SELECT h.bucket AS bucket, COUNT(pb.id) AS total
            FROM hours h
            LEFT JOIN price_batch pb
              ON pb.generated_at >= h.bucket
             AND pb.generated_at < h.bucket + interval '1 hour'
            GROUP BY h.bucket
            ORDER BY h.bucket
            """, nativeQuery = true)
    List<HourCount> countLast14Hours();

    @Query(value = """
            SELECT pb.* FROM price_batch pb
            WHERE EXISTS (
                SELECT 1 FROM price_record pr WHERE pr.batch_id = pb.id
            )
            ORDER BY pb.id DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<PriceBatch> findLatestWithRecords();

    @Query(value = """
            SELECT * FROM price_batch
    WHERE status = 'RECEIVED'
    ORDER BY
    id LIMIT 1
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<PriceBatch> findNextToClaim();

    @Modifying
    @Query(value = """
        UPDATE price_batch
        SET status = 'RECEIVED', owner_instance = NULL, claimed_at = NULL
        WHERE status IN ('PROCESSING', 'WRITING')
            AND claimed_at < now() - interval '5 minutes'
            """, nativeQuery = true)
    int reclaimExpired();

    @Query(value = """
            SELECT * FROM price_batch
    WHERE status = 'PENDING_WRITE' AND next_retry_at <= now()
    ORDER BY next_retry_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    Optional<PriceBatch> findNextToRetry();
}
