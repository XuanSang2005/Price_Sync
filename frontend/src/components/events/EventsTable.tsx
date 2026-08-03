// Bảng danh sách batch. Bấm một dòng để mở trang chi tiết.

import { Link } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusPill } from '../../lib/status'
import { resultText } from '../../lib/eventStatus'
import { formatTimeDate } from '../../utils/format'

export function EventsTable({ rows }: { rows: EventSummary[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-surface2 text-[11px] uppercase tracking-[0.05em] text-faint font-semibold">
              <th scope="col" className="text-left px-[18px] py-[11px] border-b border-border">Time</th>
              <th scope="col" className="text-left px-3 py-[11px] border-b border-border">Batch ID</th>
              <th scope="col" className="text-center px-3 py-[11px] border-b border-border">Ver</th>
              <th scope="col" className="text-center px-3 py-[11px] border-b border-border">Status</th>
              <th scope="col" className="text-right px-[18px] py-[11px] border-b border-border">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id} className="group hover:bg-surface2">
                <td className="font-mono text-xs text-muted whitespace-nowrap px-[18px] py-[13px] border-b border-border">{formatTimeDate(event.generated_at)}</td>
                <td className="font-mono text-xs font-medium px-3 py-[13px] border-b border-border max-w-[260px]">
                  <Link to="/events/$id" params={{ id: String(event.id) }}
                    className="block truncate text-fg underline-offset-4 group-hover:text-primary group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm">
                    {event.batch_id}
                  </Link>
                </td>
                <td className="font-mono text-xs text-muted text-center px-3 py-[13px] border-b border-border">v{event.version}</td>
                <td className="text-center px-3 py-[13px] border-b border-border"><StatusPill status={event.status} /></td>
                <td className="text-xs text-muted text-right px-[18px] py-[13px] border-b border-border">{resultText(event.status)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-7 py-7 text-center text-muted text-sm">No events match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
