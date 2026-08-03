package price_sync.processing.output;

import java.io.IOException;
import java.nio.file.Path;

import price_sync.domain.batch.PriceBatch;

public interface OutputWriter {
        Path write(Path payloadFile, PriceBatch batch) throws IOException;

}
