// Bảng danh sách batch. Bấm một dòng để mở trang chi tiết.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusPill } from '../../lib/status'
import { resultText } from '../../lib/eventStatus'
import { formatTimeDate } from '../../utils/format'

// Khai báo cột một lần, dùng cho CẢ hàng tiêu đề lẫn hàng dữ liệu → không bao giờ lệch nhau
const GRID_COLUMNS = '1.4fr 2fr 0.7fr 1.4fr 1.8fr'

export function EventsTable({ rows }: { rows: EventSummary[] }) {
  const navigate = useNavigate()

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* min-w + overflow-x: màn hẹp thì cuộn ngang thay vì bóp méo cột */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid gap-3 px-[18px] py-[11px] border-b border-border bg-surface2 text-[11px] uppercase tracking-[0.05em] text-faint font-semibold"
               style={{ gridTemplateColumns: GRID_COLUMNS }}>
            <div>Time</div><div>Batch ID</div><div className="text-center">Ver</div><div className="text-center">Status</div><div className="text-right">Result</div>
          </div>

          {rows.map((e) => (
            <div
              key={e.id}
              onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
              className="grid gap-3 px-[18px] py-[13px] border-b border-border items-center cursor-pointer hover:bg-surface2"
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <div className="font-mono text-[12px] text-muted whitespace-nowrap">{formatTimeDate(e.generated_at)}</div>
              <div className="font-mono text-[12px] font-medium truncate min-w-0">{e.batch_id}</div>
              <div className="font-mono text-[12px] text-muted text-center">v{e.version}</div>
              <div className="flex justify-center"><StatusPill status={e.status} /></div>
              <div className="text-[12px] text-muted truncate min-w-0 text-right">{resultText(e.status)}</div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="px-7 py-7 text-center text-muted text-[13px]">No events match.</div>
          )}
        </div>
      </div>
    </div>
  )
}
