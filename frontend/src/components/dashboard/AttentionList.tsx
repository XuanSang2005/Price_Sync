// Danh sách batch CẦN CHÚ Ý (FAILED / PENDING_WRITE / PARTIAL) — việc operator phải xử lý.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusDot } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { Panel } from '../Panel'

const MAX_ROWS = 6

export function AttentionList({ attention }: { attention: EventSummary[] }) {
  const navigate = useNavigate()

  return (
    <Panel
      title={<span className="flex items-center gap-2"><span className="w-[7px] h-[7px] rounded-full bg-accent" />Attention</span>}
      right={<span className="text-[11px] text-muted">{attention.length} open</span>}
    >
      {attention.length === 0 ? (
        <div className="px-[18px] py-6 text-[13px] text-muted text-center">All clear.</div>
      ) : (
        attention.slice(0, MAX_ROWS).map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-[18px] min-h-[52px] border-b border-border text-[12.5px]">
            <span className="font-mono text-[11px] text-faint w-[116px] flex-none whitespace-nowrap">{formatTimeDate(e.generated_at)}</span>
            <StatusDot status={e.status} />
            <div className="flex-1 min-w-0 font-mono text-[11.5px] truncate">
              {e.batch_id} <span className="text-muted">· {e.status}</span>
            </div>
            <div className="flex gap-1.5 flex-none">
              <button
                onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
                className="text-[11.5px] font-medium text-fg bg-surface border border-border px-2.5 py-[5px] rounded-md cursor-pointer hover:bg-surface2"
              >
                View
              </button>
            </div>
          </div>
        ))
      )}
    </Panel>
  )
}
