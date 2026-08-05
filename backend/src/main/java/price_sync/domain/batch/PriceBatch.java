package price_sync.domain.batch;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "price_batch")
public class PriceBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private String batchId;

    @Column(nullable = false)
    private int version;

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "owner_instance")
    private String ownerInstance;

    @Column(name = "claimed_at")
    private OffsetDateTime claimedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BatchStatus status;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "next_retry_at")
    private OffsetDateTime nextRetryAt;

    @Column(name = "output_file")
    private String outputFile;

    private static final int MAX_ATTEMPTS = 2;

    protected PriceBatch() {
    }

    public PriceBatch(String batchId, int version, OffsetDateTime generatedAt) {
        this.batchId = batchId;
        this.version = version;
        this.generatedAt = generatedAt;
        this.status = BatchStatus.RECEIVED;
    }

    public Long getId() {
        return id;
    }

    public String getBatchId() {
        return batchId;
    }

    public int getVersion() {
        return version;
    }

    public BatchStatus getStatus() {
        return status;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void markProcessing(String owner) {
        status = BatchStatus.PROCESSING;
        ownerInstance = owner;
        claimedAt = OffsetDateTime.now();
    }

    public void markFail() {
        status = BatchStatus.FAILED;
    }

    public void markWritten() {
        status = BatchStatus.WRITTEN;
    }

    public void markWriting() {
        status = BatchStatus.WRITING;
    }
    public void markPartial(){
        status = BatchStatus.PARTIAL;
    }

    public String getOutputFile() {
        return outputFile;
    }

    public void recordOutputFile(String fileName) {
        this.outputFile = fileName;
    }

    public int getRetryCount(){
        return this.retryCount;
    }

    /**
     * Only failures caused by exhausting file-write attempts can be re-driven.
     * Validation failures must go through validation again and are intentionally
     * excluded from the operator retry action.
     */
    public boolean isWriteRetryable() {
        return status == BatchStatus.FAILED && retryCount >= MAX_ATTEMPTS;
    }

    public void redrive(){
        this.status = BatchStatus.PENDING_WRITE;
        this.retryCount = 0;
        this.nextRetryAt = OffsetDateTime.now();
    }

    public void markPendingWrite() {
        retryCount += 1;
        if (retryCount >= MAX_ATTEMPTS) {
            status = BatchStatus.FAILED;
        } else {
            status = BatchStatus.PENDING_WRITE;
            nextRetryAt = OffsetDateTime.now().plusSeconds(Math.min(30L << (this.retryCount - 1), 600L));
        }
    }
}
