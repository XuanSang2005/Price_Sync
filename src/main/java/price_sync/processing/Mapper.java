package price_sync.processing;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Component;

import price_sync.domain.ChangeType;
import price_sync.domain.PriceRecord;

@Component
public class Mapper {
    public MntRow map(PriceRecord record, LocalDate businessDate) {
        MntRecordType recordType;
        String currency = record.getCurrency();
        LocalDate effStart = record.getEffectiveStart();
        LocalDate effEnd = record.getEffectiveEnd();
        ChangeType changeType = ChangeType.valueOf(record.getChangeType().toUpperCase());
        if (changeType == ChangeType.DELETE) {
            recordType = MntRecordType.FDELE;
        } else {
            recordType = MntRecordType.FDETL;
        }
        String storeIdOrZone = record.getStoreIdOrZone();
        String[] parts = storeIdOrZone.split("_", 2);
        String locType = parts[0].equalsIgnoreCase("STORE") ? "S" : "Z";
        String location = parts.length > 1 ? parts[1] : "";
        List<String> columns = new ArrayList<>();
        columns.add(record.getItemId());
        columns.add(locType);
        columns.add(location);
        if (recordType == MntRecordType.FDETL) {
            String priceString = record.getPrice().setScale(0, RoundingMode.HALF_UP).toPlainString();
            columns.add(priceString);
            if (currency == null) {
                currency = "VND";
            }
            columns.add(currency);
            if (effStart == null) {
                effStart = businessDate.plusDays(1);
            }
            columns.add(effStart.toString());
            columns.add(effEnd != null ? effEnd.toString() : "");

        }

        return new MntRow(recordType, columns);
    }
}
