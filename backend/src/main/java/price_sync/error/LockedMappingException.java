package price_sync.error;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

// Cột chuẩn (hợp đồng Oracle) — không cho tạo trùng / xoá / sửa qua API. 409 CONFLICT.
@ResponseStatus(HttpStatus.CONFLICT)
public class LockedMappingException extends RuntimeException {
    public LockedMappingException() {
        super("standard mapping column is locked (Oracle contract)");
    }
}
