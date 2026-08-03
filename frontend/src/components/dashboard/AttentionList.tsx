// Operator queue for FAILED / PENDING_WRITE / PARTIAL batches.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusDot } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { Panel } from '../Panel'

const MAX_ROWS = 6

export function AttentionList({ attention, totalCount, unavailable = false }: {
  attention: EventSummary[] | null
  totalCount?: number
  unavailable?: boolean
}) {
  const navigate = useNavigate()
  const count = totalCount ?? attention?.length ?? 0

  return (
    <Panel
      title={<span className="flex items-center gap-2"><span aria-hidden="true" className="w-[7px] h-[7px] rounded-full bg-danger" />Attention</span>}
      right={<span className="text-[11px] text-muted">{attention === null ? (unavailable ? 'Unavailable' : 'Loading') : `${count} open`}</span>}
    >
      {attention === null ? (
        <div role={unavailable ? 'alert' : 'status'} className={'px-[18px] py-6 text-[13px] text-center ' + (unavailable ? 'text-danger' : 'text-muted')}>
          {unavailable ? 'Attention events are unavailable.' : 'Loading attention events…'}
        </div>
      ) : attention.length === 0 ? (
        <div className="px-[18px] py-6 text-[13px] text-muted text-center">All clear.</div>
      ) : (
        <ul className="m-0 p-0 list-none">
          {attention.slice(0, MAX_ROWS).map((event) => (
            <li key={event.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => navigate({ to: '/events/$id', params: { id: String(event.id) } })}
                className="w-full min-h-[56px] grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-[18px] py-2.5 border-0 bg-transparent text-fg text-left cursor-pointer hover:bg-surface2"
                aria-label={`View batch ${event.batch_id}, status ${event.status}, ${formatTimeDate(event.generated_at)}`}
              >
                <StatusDot status={event.status} />
                <span className="min-w-0">
                  <span className="block font-mono text-[11.5px] truncate">{event.batch_id}</span>
                  <span className="block mt-0.5 font-mono text-[10.5px] text-faint truncate">
                    {formatTimeDate(event.generated_at)} · <span className="text-muted">{event.status}</span>
                  </span>
                </span>
                <span aria-hidden="true" className="text-[11.5px] font-semibold text-primary">View</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
