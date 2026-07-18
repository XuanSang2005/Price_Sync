// Kiểu dữ liệu khớp DTO của backend (snake_case y như JSON trả về)

export type EventSummary = {
  id: number
  batch_id: string
  version: number
  status: string
  generated_at: string
}

export type EventRecord = {
  change_id: string
  item_id: string
  store_id_or_zone: string
  validation_status: string
  set_aside_reason: string | null
}

export type EventDetail = {
  id: number
  batch_id: string
  version: number
  status: string
  generated_at: string
  records: EventRecord[]
}
