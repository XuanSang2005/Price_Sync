// Thông báo nhỏ nổi ở đáy màn hình, tự tắt sau ~2.6 giây.
// Gồm 2 phần: hook giữ state (useToast) + thẻ hiển thị (Toast).

import { useState, useCallback, useRef, useEffect } from 'react'
import { AlertIcon, CheckIcon, XIcon } from './icons'

const AUTO_HIDE_MS = 2600

export type ToastType = 'success' | 'error' | 'warning'
export type ToastMessage = { id: number; text: string; type: ToastType }
type ToastInput = string | Omit<ToastMessage, 'id'>

export function useToast() {
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const nextIdRef = useRef(0)

  const showToast = useCallback((input: ToastInput, type: ToastType = 'success') => {
    const next = typeof input === 'string' ? { text: input, type } : input
    // Có thông báo mới thì huỷ hẹn giờ cũ, nếu không thông báo mới sẽ bị tắt sớm theo hẹn giờ cũ
    window.clearTimeout(timerRef.current)
    setMessage({ ...next, id: ++nextIdRef.current })
    const hideAfter = next.type === 'error' ? 5000 : next.type === 'warning' ? 4000 : AUTO_HIDE_MS
    timerRef.current = window.setTimeout(() => setMessage(null), hideAfter)
  }, [])

  // Rời trang khi hẹn giờ còn chạy -> dọn để không setState trên component đã gỡ
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return { message, showToast }
}

export function Toast({ message, type = 'success' }: {
  message: ToastMessage | string | null | undefined
  type?: ToastType
}) {
  if (!message) return null
  const toast = typeof message === 'string' ? { id: 0, text: message, type } : message
  const tone = toast.type === 'error'
    ? 'border-danger/40 text-danger'
    : toast.type === 'warning'
      ? 'border-amber/40 text-amber'
      : 'border-green/40 text-green'
  const Icon = toast.type === 'error' ? XIcon : toast.type === 'warning' ? AlertIcon : CheckIcon
  return (
    <div
      key={toast.id}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={'fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] bg-surface border px-4 py-3 rounded-lg text-[13px] font-medium flex items-center gap-2.5 shadow-2xl ' + tone}
      style={{ animation: 'toastin .2s ease' }}
    >
      <span className="flex-none"><Icon size={16} /></span>
      <span className="text-fg">{toast.text}</span>
    </div>
  )
}
