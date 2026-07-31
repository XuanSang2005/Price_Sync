// Khối "Generated MNT file": nội dung file đã ghi ra Xcenter + nút tải về.
// Chưa có file (batch lỗi / chưa tới bước ghi) thì hiện ghi chú màu vàng.
// Thu/mở giống khối "Payload · JSON" — file nghìn dòng thì thu lại cho đỡ dài trang.

import { useState } from 'react'
import type { EventFile } from '../../types'
import { DownloadIcon } from '../icons'

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
  const [open, setOpen] = useState(true)
  const canDownload = !!file?.exists && !!file.content && !!file.file_name

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Không lồng <button> trong <button> được, nên tiêu đề và Download là hai nút NGANG HÀNG
          trong một <div>, khác khối JSON (cả thanh là một nút vì bên đó không có Download) */}
      <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left p-0 bg-transparent border-none cursor-pointer font-semibold text-[13.5px] text-fg">
          Generated MNT file
        </button>
        <div className="flex items-center gap-3">
          {file?.exists && (
            <button onClick={() => { if (canDownload) downloadAsFile(file.file_name!, file.content!) }}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-fg bg-surface border border-border px-2.5 py-1 rounded-md cursor-pointer hover:bg-surface2">
              <DownloadIcon size={12} /> Download
            </button>
          )}
          <button onClick={() => setOpen((o) => !o)}
            className="text-[11px] text-accent font-semibold bg-transparent border-none cursor-pointer p-0">
            {open ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {file?.exists ? (
        // Thu lại thì VẪN giữ tên file: biết batch này đã ghi ra file nào mà không phải mở nội dung
        <>
          <div className={'px-[18px] font-mono text-[12px] font-medium ' + (open ? 'pt-3' : 'py-3')}>{file.file_name}</div>
          {open && (
            <pre className="m-3.5 mt-2 p-3.5 bg-surface2 border border-border rounded-lg font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre">
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
