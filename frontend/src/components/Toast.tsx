// Thông báo nhỏ nổi ở đáy màn hình, tự tắt sau ~2.6 giây.
// Gồm 2 phần: hook giữ state (useToast) + thẻ hiển thị (Toast).

import { useState, useCallback, useRef, useEffect } from 'react'
import { CheckIcon } from './icons'

const AUTO_HIDE_MS = 2600

export function useToast() {
  const [message, setMessage] = useState('')
  const timerRef = useRef<number | undefined>(undefined)

  const showToast = useCallback((text: string) => {
    // Có thông báo mới thì huỷ hẹn giờ cũ, nếu không thông báo mới sẽ bị tắt sớm theo hẹn giờ cũ
    window.clearTimeout(timerRef.current)
    setMessage(text)
    timerRef.current = window.setTimeout(() => setMessage(''), AUTO_HIDE_MS)
  }, [])

  // Rời trang khi hẹn giờ còn chạy -> dọn để không setState trên component đã gỡ
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return { message, showToast }
}

export function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg px-[18px] py-[11px] rounded-lg text-[13px] font-medium flex items-center gap-2 shadow-2xl"
      style={{ animation: 'toastin .2s ease' }}
    >
      <CheckIcon size={16} /> {message}
    </div>
  )
}
