// Khối "Generated MNT file": nội dung file đã ghi ra Xcenter + nút tải về.
// Chưa có file (batch lỗi / chưa tới bước ghi) thì hiện ghi chú màu vàng.
// Thu/mở giống khối "Payload · JSON" — file nghìn dòng thì thu lại cho đỡ dài trang.

import { useState } from 'react'
import type { EventFile } from '../../types'
import { DownloadIcon } from '../icons'
import { PanelDisclosureButton } from './PanelDisclosureButton'

// Tải nội dung đang có SẴN trong bộ nhớ trình duyệt xuống máy — không gọi thêm API.
// Cách làm: gói chuỗi thành Blob → tạo URL tạm → bấm hộ thẻ <a> → thu hồi URL.
function downloadAsFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url) // không thu hồi thì URL tạm chiếm bộ nhớ tới khi đóng tab
}

export function MntFilePanel({ file }: { file: EventFile | null }) {
  const [open, setOpen] = useState(false)
  const canDownload = !!file?.exists && !!file.content && !!file.file_name

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="min-h-16 px-[18px] py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex-1 font-semibold text-[13.5px] text-fg">Generated MNT file</div>
        <div className="flex items-center gap-3">
          {file?.exists && (
            <button type="button" disabled={!canDownload} onClick={() => { if (canDownload) downloadAsFile(file.file_name!, file.content!) }}
              className="inline-flex min-h-10 items-center gap-1.5 text-[11.5px] font-medium text-fg bg-surface border border-border px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <DownloadIcon size={12} /> Download
            </button>
          )}
          {file?.exists && (
            <PanelDisclosureButton
              open={open}
              controls="mnt-file-content"
              label="generated MNT file"
              onToggle={() => setOpen((current) => !current)}
            />
          )}
        </div>
      </div>

      {file?.exists ? (
        // Thu lại thì VẪN giữ tên file: biết batch này đã ghi ra file nào mà không phải mở nội dung
        <>
          <div className={'px-[18px] font-mono text-[12px] font-medium ' + (open ? 'pt-3' : 'py-3')}>{file.file_name}</div>
          {open && (
            <pre id="mnt-file-content" className="m-3.5 mt-2 p-3.5 bg-surface2 border border-border rounded-lg font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre">
              {file.content}
            </pre>
          )}
        </>
      ) : (
        <div className="px-[18px] py-4 text-[12.5px] text-amber bg-amber-bg m-3.5 rounded-lg border border-amber">
          {file?.note ?? 'No file.'}
        </div>
      )}
    </div>
  )
}
