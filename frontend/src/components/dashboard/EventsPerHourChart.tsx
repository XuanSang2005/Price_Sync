// Biểu đồ cột "số batch mỗi giờ" — vẽ bằng div thuần, không dùng thư viện biểu đồ.

import type { EventSummary } from '../../types'

const MAX_BUCKETS = 14 // chỉ giữ 14 giờ gần nhất cho vừa bề ngang
const CHART_HEIGHT_PX = 118 // chiều cao cột CAO NHẤT; các cột khác tính theo tỉ lệ

type Bucket = { label: string; count: number; ts: number }

// Gom event theo từng giờ. Khoá gom là "YYYY-MM-DDTHH" (cắt 13 ký tự đầu của chuỗi ISO)
// → hai event cùng giờ cùng ngày mới rơi vào một cột.
function bucketByHour(events: EventSummary[]): Bucket[] {
  const buckets = new Map<string, Bucket>()
  for (const e of events) {
    const date = new Date(e.generated_at)
    const key = date.toISOString().slice(0, 13)
    const label = String(date.getHours()).padStart(2, '0')
    const current = buckets.get(key)
    if (current) current.count++
    else buckets.set(key, { label, count: 1, ts: date.getTime() })
  }
  return [...buckets.values()].sort((a, b) => a.ts - b.ts).slice(-MAX_BUCKETS)
}

export function EventsPerHourChart({ events }: { events: EventSummary[] }) {
  const bars = bucketByHour(events)
  // Math.max(1, ...) tránh chia cho 0 khi chưa có dữ liệu
  const maxCount = Math.max(1, ...bars.map((b) => b.count))

  return (
    <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold text-[13.5px]">Events per hour</div>
        <div className="text-[11.5px] text-muted">by hour · last {MAX_BUCKETS}</div>
      </div>

      {bars.length === 0 ? (
        <div className="h-[150px] grid place-items-center text-[13px] text-muted">No events yet.</div>
      ) : (
        <div className="flex items-end gap-1.5 h-[150px] pt-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div
                title={b.label + ':00 - ' + b.count + ' events'}
                className={'w-full rounded-t ' + (b.count === maxCount ? 'bg-accent' : 'bg-accent-weak border border-accent-weak')}
                // Math.max(3, ...) để cột nhỏ nhất vẫn nhìn thấy được
                style={{ height: Math.max(3, Math.round((b.count / maxCount) * CHART_HEIGHT_PX)) + 'px' }}
              />
              <div className="text-[9.5px] text-faint font-mono">{b.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
