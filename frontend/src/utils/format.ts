// Dạng GIỜ TRƯỚC NGÀY SAU "09:00 16/07/2026" - dùng cho bảng events kiểu terminal
export function formatTimeDate(iso: string): string {
  const date = new Date(iso)
  // padStart(2,'0') = thêm số 0 đằng trước cho đủ 2 chữ số (9 → "09")
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = pad(date.getHours()) + ':' + pad(date.getMinutes())
  const day = pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + date.getFullYear()
  return time + ' ' + day
}
