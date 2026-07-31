// Gọi `load` ngay khi vào trang, rồi lặp lại đều đặn cho tới khi rời trang.
// Trước đây mỗi trang tự viết setInterval + clearInterval; giờ dùng chung một chỗ.

import { useEffect } from 'react'

export function usePolling(load: () => void, intervalMs: number) {
  useEffect(() => {
    load()
    const timer = setInterval(load, intervalMs)
    // Dọn dẹp khi rời trang, nếu không đồng hồ vẫn chạy nền và gọi API mãi
    return () => clearInterval(timer)
  }, [load, intervalMs])
}
