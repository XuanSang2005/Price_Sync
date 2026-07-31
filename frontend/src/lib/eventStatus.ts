// Ý NGHĨA của các trạng thái batch (không phải màu sắc — màu nằm ở lib/status.tsx).
// Gom về một chỗ để dashboard, sidebar và trang chi tiết luôn hiểu giống nhau.

import type { EventSummary, EventDetail } from '../types'

// Các trạng thái operator cần để mắt (badge chuông + mục "Attention" ở dashboard)
export const ATTENTION_STATUSES = ['FAILED', 'PENDING_WRITE', 'PARTIAL']

// Lọc ra các batch cần chú ý, mới nhất lên đầu
export function attentionEvents(events: EventSummary[]): EventSummary[] {
  return [...events]
    .filter((e) => ATTENTION_STATUSES.includes(e.status))
    .sort((a, b) => b.id - a.id)
}

// Sắp xếp mới nhất lên đầu (id tăng dần theo thời gian nhận batch)
export function newestFirst(events: EventSummary[]): EventSummary[] {
  return [...events].sort((a, b) => b.id - a.id)
}

// Câu mô tả kết quả cho bảng Events — suy từ trạng thái THẬT, không bịa số liệu
export function resultText(status: string): string {
  switch (status) {
    case 'WRITTEN': return 'Written to Xcenter'
    case 'PARTIAL': return 'Written, some set aside'
    case 'FAILED': return 'Failed - see detail'
    case 'PENDING_WRITE': return 'Retry pending'
    default: return 'Processing'
  }
}

// ===== Vòng đời batch: 4 bước hiển thị ở trang chi tiết =====
export type StepState = 'done' | 'current' | 'error' | 'todo'
export type Step = { label: string; state: StepState }

// Dựng 4 bước từ log THẬT + trạng thái hiện tại.
export function buildSteps(status: string, logStatuses: Set<string>): Step[] {
  const beyondProcessing = ['WRITING', 'PENDING_WRITE', 'WRITTEN', 'PARTIAL', 'FAILED']
  const written = status === 'WRITTEN' || status === 'PARTIAL'
  // FAILED có 2 nguyên nhân: abort ở validation (không log PENDING_WRITE/WRITING) vs hỏng khi ghi file.
  const failedAtWrite = status === 'FAILED' && (logStatuses.has('PENDING_WRITE') || logStatuses.has('WRITING'))

  const processing: StepState =
    (status === 'FAILED' && !failedAtWrite) ? 'error' // abort ở validation → lỗi TẠI Processing
    : status === 'PROCESSING' ? 'current' // đang xử lý = current, KHÔNG phải done
    : (beyondProcessing.includes(status) || logStatuses.has('PROCESSING')) ? 'done'
    : status === 'RECEIVED' ? 'current' : 'todo'

  const writing: StepState =
    written ? 'done'
    : status === 'PENDING_WRITE' ? 'current'
    : failedAtWrite ? 'error' // chỉ đỏ Writing khi thật sự hỏng ở bước ghi
    : 'todo' // PROCESSING / FAILED-validation chưa tới Writing → todo

  // Bước cuối đổi tên theo kết cục thật của batch
  const finalLabel = status === 'FAILED' ? 'Failed' : status === 'PARTIAL' ? 'Partial'
    : status === 'PENDING_WRITE' ? 'Pending' : 'Written'
  const finalState: StepState =
    status === 'WRITTEN' ? 'done' : status === 'PARTIAL' ? 'done'
    : status === 'FAILED' ? 'error' : status === 'PENDING_WRITE' ? 'current' : 'todo'

  return [
    { label: 'Received', state: 'done' }, // có bản ghi trong DB nghĩa là đã nhận xong
    { label: 'Processing', state: processing },
    { label: 'Writing', state: writing },
    { label: finalLabel, state: finalState },
  ]
}

// Dựng lại payload JSON gốc từ các record đã lưu (extras trải phẳng vào cùng cấp như lúc HQ gửi)
export function buildPayload(detail: EventDetail): string {
  const payload = {
    batch_id: detail.batch_id,
    version: detail.version,
    generated_at: detail.generated_at,
    records: detail.records.map((r) => ({
      change_id: r.change_id,
      version: r.version,
      item_id: r.item_id,
      store_id_or_zone: r.store_id_or_zone,
      price: r.price,
      currency: r.currency,
      effective_start: r.effective_start,
      effective_end: r.effective_end,
      change_type: r.change_type,
      ...(r.extras ?? {}),
    })),
  }
  return JSON.stringify(payload, null, 2) // null, 2 = xuống dòng + thụt 2 space cho dễ đọc
}
