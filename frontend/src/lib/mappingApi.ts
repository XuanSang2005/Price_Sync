// Mọi lời gọi HTTP của trang mapping gom về ĐÂY. Trang chỉ gọi hàm, không tự viết fetch,
// nên đổi đường dẫn API chỉ phải sửa một chỗ.

import type { MappingRule, MappingMeta, MappingPreview } from '../types'

export function fetchRules(signal?: AbortSignal): Promise<MappingRule[]> {
  return fetchJson<MappingRule[]>('/api/v1/mappings', 'Could not load mapping rules', signal)
}

export function fetchMeta(signal?: AbortSignal): Promise<MappingMeta> {
  return fetchJson<MappingMeta>('/api/v1/mappings/meta', 'Could not load mapping metadata', signal)
}

export function fetchPreview(signal?: AbortSignal): Promise<MappingPreview> {
  return fetchJson<MappingPreview>('/api/v1/mappings/preview', 'Could not load mapping preview', signal)
}

// Một cột gửi lên server khi Save (vị trí = thứ tự trong mảng)
export type SaveColumn = {
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
    return responseError(res, 'Could not save mapping').then((error) => { throw error })
  })
}

async function fetchJson<T>(url: string, fallback: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw await responseError(response, fallback)
  try {
    return await response.json() as T
  } catch {
    throw new Error(`${fallback}: server returned invalid JSON`)
  }
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const status = response.status ? ` (${response.status})` : ''
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return new Error(message)
    }
  } catch {
    // Body lỗi có thể rỗng hoặc plain text; fallback bên dưới vẫn đủ ngữ cảnh.
  }
  return new Error(fallback + status)
}
