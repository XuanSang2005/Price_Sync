// Bốn ô số liệu tổng quan trên đầu dashboard, tính từ /events/metrics (đếm batch theo trạng thái).

type Card = { label: string; value: number; sub: string; accent: boolean }

// Gom metrics thô thành đúng 4 con số nghiệp vụ operator quan tâm
function buildCards(metrics: Record<string, number>): Card[] {
  const total = Object.values(metrics).reduce((a, b) => a + b, 0)
  const written = metrics.WRITTEN ?? 0
  const partial = metrics.PARTIAL ?? 0
  const failed = metrics.FAILED ?? 0
  // "Đang chạy" = mọi trạng thái chưa tới đích, gộp lại cho dễ nhìn
  const inflight = (metrics.RECEIVED ?? 0) + (metrics.PROCESSING ?? 0) + (metrics.WRITING ?? 0) + (metrics.PENDING_WRITE ?? 0)

  return [
    { label: 'Total events', value: total, sub: 'all time', accent: false },
    { label: 'Written to Xcenter', value: written, sub: partial > 0 ? `+${partial} partial` : 'all', accent: false },
    { label: 'Errors', value: failed, sub: 'failed batches', accent: failed > 0 }, // có lỗi mới tô đỏ
    { label: 'In progress', value: inflight, sub: 'received → pending write', accent: false },
  ]
}

export function MetricCards({ metrics }: { metrics: Record<string, number> }) {
  return (
    // auto-fit + minmax: đủ rộng thì 4 ô một hàng, hẹp lại thì tự xuống dòng
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
      {buildCards(metrics).map((m) => (
        <div key={m.label} className="bg-surface border border-border rounded-xl px-[18px] py-4 flex flex-col gap-1.5">
          <div className="text-[12px] text-muted font-medium">{m.label}</div>
          <div className={'text-[28px] font-bold tracking-tight font-mono ' + (m.accent ? 'text-accent' : 'text-fg')}>
            {m.value}
          </div>
          <div className={'text-[11px] ' + (m.accent ? 'text-accent' : 'text-faint')}>{m.sub}</div>
        </div>
      ))}
    </div>
  )
}
