// Bảng màu trạng thái — dùng CHUNG ở mọi trang (list, detail, metrics, sidebar).
// Tông trầm cho nền tối: nền mờ (màu/10) + chữ nhạt (màu-400), không dùng màu chói.
// Quy ước: trạng thái luôn hiện KÈM chữ, màu chỉ là phụ trợ.

// ---- Trạng thái BATCH (vòng đời batch) ----

export const BATCH_STATUS_STYLES: Record<string, { badge: string; dot: string; text: string }> = {
  RECEIVED: { badge: 'bg-zinc-500/10 text-zinc-400', dot: 'bg-zinc-400', text: 'text-zinc-400' },
  PROCESSING: { badge: 'bg-blue-500/10 text-blue-400', dot: 'bg-blue-400', text: 'text-blue-400' },
  WRITING: { badge: 'bg-blue-500/10 text-blue-300', dot: 'bg-blue-300', text: 'text-blue-300' },
  PENDING_WRITE: { badge: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400', text: 'text-amber-400' },
  WRITTEN: { badge: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  PARTIAL: { badge: 'bg-orange-500/10 text-orange-400', dot: 'bg-orange-400', text: 'text-orange-400' },
  FAILED: { badge: 'bg-red-500/10 text-red-400', dot: 'bg-red-400', text: 'text-red-400' },
}

// Thứ tự hiển thị theo vòng đời (trang Metrics dùng để sắp các ô)
export const BATCH_STATUS_ORDER = [
  'RECEIVED',
  'PROCESSING',
  'WRITING',
  'PENDING_WRITE',
  'WRITTEN',
  'PARTIAL',
  'FAILED',
]

// Trạng thái lạ (phòng hờ) → xám trung tính
const FALLBACK_STYLE = { badge: 'bg-zinc-500/10 text-zinc-400', dot: 'bg-zinc-400', text: 'text-zinc-400' }

// Kiểu chữ-trần (không pill): chấm màu + CHỮ HOA giãn cách — dùng cho bảng events kiểu terminal
export function StatusText({ status }: { status: string }) {
  const style = BATCH_STATUS_STYLES[status] ?? FALLBACK_STYLE
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.25em]">
      <span className={'w-1.5 h-1.5 rounded-full ' + style.dot} />
      <span className={style.text}>{status}</span>
    </span>
  )
}

// Viên thuốc (pill) hiển thị trạng thái batch: chấm màu + tên trạng thái
export function StatusBadge({ status }: { status: string }) {
  const style = BATCH_STATUS_STYLES[status] ?? FALLBACK_STYLE
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ' +
        style.badge
      }
    >
      <span className={'w-1.5 h-1.5 rounded-full ' + style.dot} />
      {status}
    </span>
  )
}

// ---- Trạng thái RECORD (kiểm định từng dòng giá) ----

const RECORD_STATUS_STYLES: Record<string, string> = {
  VALID: 'bg-emerald-500/10 text-emerald-400',
  PENDING: 'bg-zinc-500/10 text-zinc-400',
  SET_ASIDE: 'bg-orange-500/10 text-orange-400',
  SUPERSEDED: 'bg-zinc-500/10 text-zinc-500',
}

export function RecordBadge({ status }: { status: string }) {
  const style = RECORD_STATUS_STYLES[status] ?? FALLBACK_STYLE.badge
  return (
    <span className={'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ' + style}>
      {status}
    </span>
  )
}
