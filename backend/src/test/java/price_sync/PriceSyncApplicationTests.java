package price_sync;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "app.security.api-key=test",
    "app.security.hmac-secret=test"
})
class PriceSyncApplicationTests {

	@Test
	void contextLoads() {
	}

}
