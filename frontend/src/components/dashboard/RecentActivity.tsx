// Latest batches. Each row is a real button so it works with Tab/Enter/Space.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { Panel } from '../Panel'

export function RecentActivity({ recent, unavailable = false }: {
  recent: EventSummary[] | null
  unavailable?: boolean
}) {
  const navigate = useNavigate()

  return (
    <Panel
      title="Recent activity"
      right={recent && (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-green" style={{ animation: 'pip 2.4s ease-in-out infinite' }} />
          Live
        </span>
      )}
    >
      {recent === null ? (
        <div role={unavailable ? 'alert' : 'status'} className={'px-[18px] py-6 text-[13px] text-center ' + (unavailable ? 'text-danger' : 'text-muted')}>
          {unavailable ? 'Recent activity is unavailable.' : 'Loading recent activity…'}
        </div>
      ) : recent.length === 0 ? (
        <div className="px-[18px] py-6 text-[13px] text-muted text-center">No data yet.</div>
      ) : (
        <ul className="m-0 p-0 list-none">
          {recent.map((event) => (
            <li key={event.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => navigate({ to: '/events/$id', params: { id: String(event.id) } })}
                className="w-full min-h-[56px] grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-[18px] py-2.5 border-0 bg-transparent text-fg text-left cursor-pointer hover:bg-surface2"
                aria-label={`View batch ${event.batch_id}, version ${event.version}, status ${event.status}, ${formatTimeDate(event.generated_at)}`}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[11.5px] truncate">
                    {event.batch_id} <span className="text-muted">· v{event.version}</span>
                  </span>
                  <span className="block mt-0.5 font-mono text-[10.5px] text-faint truncate">{formatTimeDate(event.generated_at)}</span>
                </span>
                <StatusPill status={event.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
