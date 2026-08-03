// Khối "Payload · JSON": dựng lại nội dung HQ đã gửi từ các record đã lưu, thu/mở được.

import { useMemo, useState } from 'react'
import type { EventDetail } from '../../types'
import { buildPayload } from '../../lib/eventStatus'
import { PanelDisclosureButton } from './PanelDisclosureButton'

export function PayloadPanel({ detail }: { detail: EventDetail }) {
  const [open, setOpen] = useState(false)
  const payload = useMemo(() => open ? buildPayload(detail) : '', [detail, open])

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="min-h-16 flex items-center justify-between gap-3 border-b border-border px-[18px] py-3">
        <div className="flex-1 font-semibold text-[13.5px] text-fg">Payload · JSON</div>
        <PanelDisclosureButton
          open={open}
          controls="event-payload"
          label="JSON payload"
          onToggle={() => setOpen((current) => !current)}
        />
      </div>
      {open && (
        // <pre> giữ nguyên xuống dòng + khoảng trắng của JSON đã format
        <pre id="event-payload" className="m-0 p-3.5 font-mono text-[11.5px] leading-relaxed text-fg overflow-x-auto whitespace-pre">
          {payload}
        </pre>
      )}
    </div>
  )
}
