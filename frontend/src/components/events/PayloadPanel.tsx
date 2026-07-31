// Khối "Payload · JSON": dựng lại nội dung HQ đã gửi từ các record đã lưu, thu/mở được.

import { useState } from 'react'
import type { EventDetail } from '../../types'
import { buildPayload } from '../../lib/eventStatus'

export function PayloadPanel({ detail }: { detail: EventDetail }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* cả thanh tiêu đề là nút bấm để thu/mở */}
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-[18px] py-3.5 border-b border-border bg-transparent cursor-pointer">
        <span className="font-semibold text-[13.5px]">Payload · JSON</span>
        <span className="text-[11px] text-accent font-semibold">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        // <pre> giữ nguyên xuống dòng + khoảng trắng của JSON đã format
        <pre className="m-0 p-3.5 font-mono text-[11.5px] leading-relaxed text-fg overflow-x-auto whitespace-pre">
          {buildPayload(detail)}
        </pre>
      )}
    </div>
  )
}
