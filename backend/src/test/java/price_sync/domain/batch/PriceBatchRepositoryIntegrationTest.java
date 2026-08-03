package price_sync.domain.batch;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PriceBatchRepositoryIntegrationTest {
    @Autowired
    private PriceBatchRepository repository;

    @Test
    void hourlyProjectionReturnsFourteenUsableInstantBuckets() {
        var buckets = repository.countLast14Hours();

        assertThat(buckets).hasSize(14).allSatisfy(bucket -> {
            assertThat(bucket.getBucket()).isNotNull();
            assertThat(bucket.getTotal()).isGreaterThanOrEqualTo(0);
        });
    }

    @Test
    void consoleQueriesAcceptEscapedWildcardsAndLatestRecordLookup() {
        assertThat(repository.searchForConsole(null, "!%", PageRequest.of(0, 10))).isNotNull();
        assertThat(repository.findLatestWithRecords()).isNotNull();
    }
}
