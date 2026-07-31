// Mọi lời gọi HTTP của trang mapping gom về ĐÂY. Trang chỉ gọi hàm, không tự viết fetch,
// nên đổi đường dẫn API chỉ phải sửa một chỗ.

import type { MappingRule, MappingMeta, MappingPreview } from '../types'

export function fetchRules(): Promise<MappingRule[]> {
  return fetch('/api/v1/mappings').then((res) => {
    if (!res.ok) throw new Error('GET /mappings failed')
    return res.json()
  })
}

export function fetchMeta(): Promise<MappingMeta> {
  return fetch('/api/v1/mappings/meta').then((res) => {
    if (!res.ok) throw new Error('GET /mappings/meta failed')
    return res.json()
  })
}

export function fetchPreview(): Promise<MappingPreview> {
  return fetch('/api/v1/mappings/preview').then((res) => {
    if (!res.ok) throw new Error('GET /mappings/preview failed')
    return res.json()
  })
}

// Một cột gửi lên server khi Save (vị trí = thứ tự trong mảng)
export type SaveColumn = {
  record_type: string
  position: number
  json_field: string
  mnt_column: string
  rule_type: string
  rule_value: string | null
  required: boolean
}

// PUT thay TOÀN BỘ luật của một record_type. Lỗi -> ném Error kèm message của server
// (vd 409 khi chiếm dụng tên cột chuẩn) để màn hình hiện đúng lý do, không nuốt thành "Save failed".
export function saveMapping(recordType: string, body: SaveColumn[]): Promise<void> {
  return fetch(`/api/v1/mappings/${recordType}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => {
    if (res.ok) return
    // Đọc body lỗi để lấy message; body không phải JSON thì dùng câu mặc định
    return res.json()
      .catch(() => ({}))
      .then((err) => { throw new Error(err.message ?? 'Save failed') })
  })
}
