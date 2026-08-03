const pad = (value: number) => String(value).padStart(2, '0')

// Dạng GIỜ TRƯỚC NGÀY SAU "09:00 16/07/2026" - dùng cho bảng events kiểu terminal
export function formatTimeDate(iso: string): string {
  const date = new Date(iso)
  const time = pad(date.getHours()) + ':' + pad(date.getMinutes())
  const day = pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear()
  return time + ' ' + day
}
