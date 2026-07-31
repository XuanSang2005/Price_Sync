// Chuông cảnh báo trên thanh header: số batch cần chú ý + danh sách rút gọn khi bấm vào.

import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusDot } from '../../lib/status'
import { BellIcon } from '../icons'

const MAX_ROWS = 6 // dropdown chỉ liệt kê vài dòng; xem đủ thì sang trang Events

export function AlertsBell({ attention, open, onToggle, onClose }: {
  attention: EventSummary[] // đã lọc + sắp xếp sẵn ở __root
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()

  function goToEvent(id: number) {
    onClose()
    navigate({ to: '/events/$id', params: { id: String(id) } })
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer relative hover:bg-border"
        title="Alerts"
      >
        <BellIcon size={16} />
        {attention.length > 0 && (
          <span className="absolute -top-[6px] -right-[6px] min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-text text-[10.5px] font-bold grid place-items-center border-2 border-surface leading-none">
            {attention.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[42px] w-[320px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-40"
          style={{ animation: 'fadein .12s ease' }}
        >
          <div className="px-3.5 py-3 border-b border-border font-semibold text-[13px] flex justify-between items-center">
            Alerts
            <span className="text-[11px] text-muted font-medium">{attention.length} open</span>
          </div>

          {attention.length === 0 ? (
            <div className="px-3.5 py-5 text-[12.5px] text-muted text-center">All clear.</div>
          ) : (
            attention.slice(0, MAX_ROWS).map((e) => (
              <div
                key={e.id}
                onClick={() => goToEvent(e.id)}
                className="px-3.5 py-[11px] border-b border-border cursor-pointer flex gap-2.5 items-start hover:bg-surface2"
              >
                <span className="mt-1"><StatusDot status={e.status} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{e.batch_id}</div>
                  <div className="text-[11px] text-muted font-mono">{e.status}</div>
                </div>
              </div>
            ))
          )}

          <div
            onClick={() => { onClose(); navigate({ to: '/events' }) }}
            className="px-3.5 py-2.5 text-[12px] text-accent font-semibold cursor-pointer text-center hover:bg-surface2"
          >
            View all events
          </div>
        </div>
      )}
    </div>
  )
}
