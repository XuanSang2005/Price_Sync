// Danh sách batch mới nhất, bấm vào để xem chi tiết.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { Panel } from '../Panel'

export function RecentActivity({ recent }: { recent: EventSummary[] }) {
  const navigate = useNavigate()

  return (
    <Panel
      title="Recent activity"
      right={
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          {/* chấm nhấp nháy báo trang đang tự làm tươi (animation 'pip' trong index.css) */}
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ animation: 'pip 2.4s ease-in-out infinite' }} />
          Live
        </span>
      }
    >
      {recent.length === 0 ? (
        <div className="px-[18px] py-6 text-[13px] text-muted text-center">No data yet.</div>
      ) : (
        recent.map((e) => (
          <div
            key={e.id}
            onClick={() => navigate({ to: '/events/$id', params: { id: String(e.id) } })}
            className="flex items-center gap-3 px-[18px] min-h-[52px] border-b border-border text-[12.5px] cursor-pointer hover:bg-surface2"
          >
            <span className="font-mono text-[11px] text-faint w-[116px] flex-none whitespace-nowrap">{formatTimeDate(e.generated_at)}</span>
            <div className="flex-1 min-w-0 font-mono text-[11.5px] truncate">
              {e.batch_id} <span className="text-muted">· v{e.version}</span>
            </div>
            <StatusPill status={e.status} />
          </div>
        ))
      )}
    </Panel>
  )
}
