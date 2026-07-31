// Nhật ký vòng đời: mỗi lần batch đổi trạng thái là một dòng (bảng batch_log dưới DB).

import type { EventLog } from '../../types'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { Panel } from '../Panel'

export function LifecycleLog({ logs }: { logs: EventLog[] }) {
  return (
    <Panel title="Lifecycle log">
      {logs.length === 0 ? (
        <div className="px-[18px] py-5 text-[12.5px] text-muted">No log yet.</div>
      ) : (
        logs.map((l, i) => (
          <div key={i} className="flex items-center gap-3 px-[18px] py-2.5 border-b border-border text-[12.5px]">
            <span className="font-mono text-[11px] text-faint w-[108px] flex-none whitespace-nowrap">{formatTimeDate(l.created_at)}</span>
            <StatusPill status={l.status} />
            <span className="text-muted flex-1 min-w-0 truncate">{l.note || '-'}</span>
          </div>
        ))
      )}
    </Panel>
  )
}
