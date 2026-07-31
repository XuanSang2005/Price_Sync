// Toàn bộ lời gọi API của console gom về ĐÂY (trừ trang mapping — xem lib/mappingApi.ts).
// Trang chỉ gọi hàm; đổi đường dẫn / thêm header chỉ phải sửa một chỗ.

import type { EventSummary, EventDetail, EventLog, EventFile, Health, ConfigItem } from '../types'

// Hàm dùng chung: gọi GET rồi đọc JSON, lỗi HTTP thì ném Error (đừng để trang nhận "undefined")
function getJson<T>(url: string): Promise<T> {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
    return res.json() as Promise<T>
  })
}

export function fetchEvents(): Promise<EventSummary[]> {
  return getJson('/api/v1/events')
}

export function fetchEventDetail(id: string): Promise<EventDetail> {
  return getJson(`/api/v1/events/${id}`)
}

export function fetchEventLogs(id: string): Promise<EventLog[]> {
  return getJson(`/api/v1/events/${id}/logs`)
}

export function fetchEventFile(id: string): Promise<EventFile> {
  return getJson(`/api/v1/events/${id}/file`)
}

// Đếm batch theo từng trạng thái, vd {"WRITTEN":3,"FAILED":1,...}
export function fetchMetrics(): Promise<Record<string, number>> {
  return getJson('/api/v1/events/metrics')
}

export function fetchHealth(): Promise<Health> {
  return getJson('/api/v1/health')
}

export function fetchConfig(): Promise<ConfigItem[]> {
  return getJson('/api/v1/config')
}

// Sửa một dòng config. Lỗi -> ném Error để nơi gọi hiện toast.
export function saveConfig(configKey: string, configValue: string): Promise<void> {
  return fetch(`/api/v1/config/${configKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config_value: configValue }),
  }).then((res) => {
    if (!res.ok) throw new Error('Save failed')
  })
}
