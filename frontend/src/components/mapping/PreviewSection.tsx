// Khu preview dưới cùng: lấy bản ghi thật của batch gần nhất, cho xem "trước khi map" và
// "sau khi map". Bảng After tính LIVE từ cột nháp (computeAfter) nên chưa Save vẫn thấy kết quả.
// GHIM DÍNH (sticky bottom): kéo-thả field ở trên vẫn luôn thấy kết quả ở dưới, không phải cuộn.
// THU GỌN (mặc định) = TỐI GIẢN: chỉ đúng bảng After, KHÔNG nhãn, KHÔNG tiêu đề — nút bung
// là một chevron nhỏ nằm CẠNH bảng nên không tốn thêm dòng nào. Mở ra mới hiện nhãn + bảng Before.

import { useState } from 'react'
import { ArrowRightIcon, ChevronUpIcon, ChevronDownIcon } from '../icons'
import type { MappingPreviewRow } from '../../types'
import { type Col, computeAfter } from '../../lib/mappingRules'

export function PreviewSection({ rows, cols, recordType }: {
  rows: MappingPreviewRow[] // đã lọc đúng record_type đang chỉnh
  cols: Col[]
  recordType: string
}) {
  const [open, setOpen] = useState(false)

  if (rows.length === 0) {
    return (
      <div className="border-t border-border pt-6 flex flex-col gap-4">
        <div className="text-[12px] text-muted">No sample {recordType} records in the latest batch.</div>
      </div>
    )
  }

  const afterHeaders = cols.map((c) => c.mnt_column)
  const computedRows = rows.map((r) => ({ row: r, after: computeAfter(r.fields, cols) }))

  // Bảng After dựng MỘT LẦN, dùng cho cả hai trạng thái — chỉ khác chỗ có nhãn hay không.
  // Thu gọn: title = undefined → PreviewTable bỏ luôn hàng nhãn, tiết kiệm ~24px.
  const afterTable = (
    <PreviewTable green
      title={open ? 'After - MNT columns (this becomes the file)' : undefined}
      headers={['RECORD_TYPE', ...afterHeaders]}
      // after = null nghĩa là bản ghi không map được → hiện một hàng toàn dấu '-'
      rows={computedRows.map(({ row, after }) => [row.record_type, ...(after ?? Array(afterHeaders.length).fill('-'))])}
      notes={computedRows.map(({ after }) => (after === null ? 'unmappable - unknown prefix or missing field' : null))}
      // Khi mở, nút thu nằm ngay hàng nhãn của bảng After
      action={open ? <ToggleButton open onClick={() => setOpen(false)} /> : undefined} />
  )

  return (
    // -mx-7 px-7: nhả khỏi padding ngang của trang để thanh dock kẻ hết bề ngang.
    <div className="sticky bottom-0 z-10 -mx-7 px-7 py-2 bg-bg border-t border-border">
      {open ? (
        // max-h: mở cả 2 bảng cũng không bao giờ ăn hết màn hình
        <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto">
          <PreviewTable title="Before - source feeding each column" green={false}
            headers={['change_type', ...cols.map((c) => c.json_field || '(none)')]}
            rows={rows.map((r) => [
              r.before?.change_type ?? r.fields?.change_type ?? '',
              ...cols.map((c) => r.before?.[c.json_field] ?? r.fields?.[c.json_field] ?? ''),
            ])} />

          <div className="flex items-center justify-center gap-2 text-accent text-[12px] font-semibold">
            <span className="h-px w-10 bg-border2" />
            <span className="inline-flex items-center gap-1.5 bg-accent-weak px-3 py-1 rounded-full">Apply mapping <ArrowRightIcon size={14} /></span>
            <span className="h-px w-10 bg-border2" />
          </div>

          {afterTable}
        </div>
      ) : (
        // Thu gọn: bảng nằm CẠNH nút, không có dòng nào ở trên → chiều cao = đúng chiều cao bảng
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">{afterTable}</div>
          <ToggleButton open={false} onClick={() => setOpen(true)} />
        </div>
      )}
    </div>
  )
}

// Nút bung/thu. Mở: có chữ (nằm trên hàng nhãn, còn chỗ). Thu: chỉ chevron vuông cho gọn.
function ToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const shared = 'inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-muted ' +
    'border border-border rounded-lg bg-surface cursor-pointer hover:text-fg hover:border-border2'
  if (open) {
    return (
      <button onClick={onClick} title="Hide the before table" className={shared + ' px-2.5 py-1.5'}>
        Hide before <ChevronDownIcon size={12} />
      </button>
    )
  }
  return (
    <button onClick={onClick} title="Show the before table" className={shared + ' flex-none w-7 h-7'}>
      <ChevronUpIcon size={12} />
    </button>
  )
}

// Bảng dữ liệu thô dùng chung cho cả Before và After (green = tô màu bảng After)
// title bỏ trống → KHÔNG dựng hàng nhãn (chế độ tối giản của thanh preview khi thu gọn)
// action: chỗ gắn thêm nút vào bên phải hàng nhãn (dùng cho nút bung/thu bảng Before)
function PreviewTable({ title, headers, rows, green, notes, action }: {
  title?: string; headers: string[]; rows: string[][]; green: boolean
  notes?: (string | null)[]; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <div className="flex items-center justify-between gap-3">
          <div className={'flex items-center gap-2 text-[11px] uppercase tracking-[0.05em] font-semibold ' + (green ? 'text-green' : 'text-muted')}>
            <span className={'w-[7px] h-[7px] rounded-full ' + (green ? 'bg-green' : 'bg-muted')} />{title}
          </div>
          {action}
        </div>
      )}
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr className="bg-surface2">
                {headers.map((h, i) => (
                  <th key={i} className={'px-3 py-2 text-left font-mono text-[11px] font-semibold whitespace-nowrap border-b border-border ' + (green && i === 0 ? 'text-accent' : 'text-muted')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((v, ci) => (
                    <td key={ci} className={'px-3 py-2 font-mono text-[12px] whitespace-nowrap border-b border-border ' +
                      (green && ci === 0 ? 'bg-accent-weak text-accent font-medium ' : '') + (v === '-' || v === '' ? 'text-faint' : '')}>
                      {v === '' ? '-' : v}{green && ci === row.length - 1 && notes?.[ri] ? <span className="text-amber"> · {notes[ri]}</span> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
