// Gọi `load` ngay khi vào trang, rồi lặp lại đều đặn cho tới khi rời trang.
// Trước đây mỗi trang tự viết setInterval + clearInterval; giờ dùng chung một chỗ.

import { useCallback, useEffect, useRef } from 'react'

type PollingLoad = (signal: AbortSignal) => void | Promise<void>

/**
 * Poll after the previous request has settled, so slow responses never overlap.
 * Requests are aborted on unmount/dependency change and polling pauses in hidden tabs.
 */
export function usePolling(load: PollingLoad, intervalMs: number, enabled = true) {
  const refreshRef = useRef<() => void>(() => undefined)
  const refresh = useCallback(() => refreshRef.current(), [])

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    let controller: AbortController | undefined
    let generation = 0

    const schedule = (currentGeneration: number) => {
      if (!stopped && enabled && currentGeneration === generation) {
        timer = window.setTimeout(() => void run(false), intervalMs)
      }
    }

    const run = async (forced: boolean) => {
      if (stopped) return
      const currentGeneration = ++generation
      window.clearTimeout(timer)
      controller?.abort()

      if (!forced && document.visibilityState === 'hidden') {
        schedule(currentGeneration)
        return
      }

      controller = new AbortController()
      try {
        await load(controller.signal)
      } catch (error) {
        // The page owns visible error state. Abort is expected during navigation/filter changes.
        if (error instanceof DOMException && error.name === 'AbortError') return
      } finally {
        schedule(currentGeneration)
      }
    }

    const onVisibilityChange = () => {
      if (!enabled || document.visibilityState !== 'visible') return
      window.clearTimeout(timer)
      void run(false)
    }

    // Manual refresh also works while automatic polling is disabled (for
    // terminal event details), and aborts any request already in flight.
    refreshRef.current = () => { void run(true) }
    if (enabled) void run(false)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopped = true
      generation += 1
      window.clearTimeout(timer)
      controller?.abort()
      refreshRef.current = () => undefined
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [load, intervalMs, enabled])

  return refresh
}
