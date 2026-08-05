// Toàn bộ lời gọi API của console gom về ĐÂY (trừ trang mapping — xem lib/mappingApi.ts).
// Trang chỉ gọi hàm; đổi đường dẫn / thêm header chỉ phải sửa một chỗ.

import type {
  EventDetail, EventLog, EventFile, Health, ConfigItem,
  EventPage, EventAttention, EventDashboard, EventProgress,
} from '../types'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function responseError(res: Response, fallback: string): Promise<ApiError> {
  const contentType = res.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('application/json')) {
      const body = await res.json() as { message?: string; error?: string }
      return new ApiError(body.message || body.error || fallback, res.status)
    }
    const text = (await res.text()).trim()
    return new ApiError(text || fallback, res.status)
  } catch {
    return new ApiError(fallback, res.status)
  }
}

// Hàm dùng chung: lỗi HTTP luôn trở thành ApiError có status + message từ backend.
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw await responseError(res, `Unable to load ${url}`)
  return res.json() as Promise<T>
}

export function fetchEventPage({ page, size = 50, status, search, signal }: {
  page: number
  size?: number
  status?: string
  search?: string
  signal?: AbortSignal
}): Promise<EventPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status && status !== 'all') params.set('status', status)
  if (search?.trim()) params.set('search', search.trim())
  return getJson(`/api/v1/events/page?${params}`, signal)
}

export function fetchEventAttention(signal?: AbortSignal): Promise<EventAttention> {
  return getJson('/api/v1/events/attention?limit=6', signal)
}

export function fetchEventDashboard(signal?: AbortSignal): Promise<EventDashboard> {
  return getJson('/api/v1/events/dashboard', signal)
}

export function fetchEventDetail(id: string, signal?: AbortSignal): Promise<EventDetail> {
  return getJson(`/api/v1/events/${id}`, signal)
}

export function fetchEventProgress(id: string, signal?: AbortSignal): Promise<EventProgress> {
  return getJson(`/api/v1/events/${id}/status`, signal)
}

export function fetchEventLogs(id: string, signal?: AbortSignal): Promise<EventLog[]> {
  return getJson(`/api/v1/events/${id}/logs`, signal)
}

export function fetchEventFile(id: string, signal?: AbortSignal): Promise<EventFile> {
  return getJson(`/api/v1/events/${id}/file`, signal)
}

export async function retryEvent(id: string): Promise<boolean> {
  const res = await fetch(`/api/v1/events/${id}/retry`, { method: 'POST' })
  if (!res.ok) throw await responseError(res, 'Retry failed')
  return res.status === 202
}

export function fetchHealth(signal?: AbortSignal): Promise<Health> {
  return getJson('/api/v1/health', signal)
}

export function fetchConfig(): Promise<ConfigItem[]> {
  return getJson('/api/v1/config')
}

// Sửa một dòng config. Lỗi -> ném Error để nơi gọi hiện toast.
export async function saveConfig(configKey: string, configValue: string): Promise<void> {
  const res = await fetch(`/api/v1/config/${encodeURIComponent(configKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config_value: configValue }),
  })
  if (!res.ok) throw await responseError(res, 'Save failed')
}
