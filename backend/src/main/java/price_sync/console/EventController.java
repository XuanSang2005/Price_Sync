package price_sync.console;

import price_sync.console.dto.EventDetail;
import price_sync.console.dto.EventLog;
import price_sync.console.dto.EventFile;
import price_sync.console.dto.EventAttention;
import price_sync.console.dto.EventDashboard;
import price_sync.console.dto.EventPage;
import price_sync.console.dto.EventProgress;

import org.springframework.web.bind.annotation.RestController;

import price_sync.domain.batch.BatchStatus;
import price_sync.processing.BatchProcessor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
public class EventController {
    private final EventService eventService;
    private final BatchProcessor batchProcessor;

    public EventController(EventService eventService, BatchProcessor batchProcessor) {
        this.eventService = eventService;
        this.batchProcessor = batchProcessor;
    }

    // Trang /events: hien danh sach batch, phan trang, loc status va tim batch_id.
    @GetMapping("/api/v1/events/page")
    public EventPage getEventsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) BatchStatus status,
            @RequestParam(defaultValue = "") String search) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(10, Math.min(size, 100));
        return eventService.getEventsPage(safePage, safeSize, status, search);
    }

    // Header va sidebar: hien tong so va cac batch moi nhat trong muc Can chu y.
    @GetMapping("/api/v1/events/attention")
    public EventAttention getAttention(@RequestParam(defaultValue = "6") int limit) {
        return eventService.getAttention(Math.max(1, Math.min(limit, 20)));
    }

    // Trang /dashboard: gom metrics, recent, attention va bieu do theo gio.
    @GetMapping("/api/v1/events/dashboard")
    public EventDashboard getDashboard() {
        return eventService.getDashboard();
    }

    // Trang /events/{id}: tai thong tin batch va danh sach record luc mo trang.
    @GetMapping("/api/v1/events/{id}")
    public EventDetail getEventDetails(@PathVariable Long id) {
        return eventService.getEventDetails(id);
    }

    // Trang /events/{id}: poll trang thai ngan gon khi batch dang duoc xu ly.
    @GetMapping("/api/v1/events/{id}/status")
    public EventProgress getEventProgress(@PathVariable Long id) {
        return eventService.getEventProgress(id);
    }

    // Trang /events/{id}: hien timeline RECEIVED, PROCESSING, WRITING va ket qua.
    @GetMapping("/api/v1/events/{id}/logs")
    public List<EventLog> getLogs(@PathVariable Long id) {
        return eventService.getLogs(id);
    }

    // Trang /events/{id}: doc va hien noi dung file MNT that da ghi cho batch.
    @GetMapping("/api/v1/events/{id}/file")
    public EventFile getFile(@PathVariable Long id) {
        return eventService.getFile(id);
    }

    // Trang /events/{id}: nut Retry dua write-failure FAILED ve PENDING_WRITE.
    @PostMapping("/api/v1/events/{id}/retry")
    public ResponseEntity<String> retry(@PathVariable Long id) {
        if (batchProcessor.retry(id)) {
            return ResponseEntity.accepted().body("Receive"); // 202 neu FAILED duoc redrive
        }
        return ResponseEntity.ok("Done"); // 200 neu batch khong du dieu kien
    }

}
