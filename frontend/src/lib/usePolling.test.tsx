import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePolling } from './usePolling'

describe('usePolling', () => {
  afterEach(() => vi.useRealTimers())

  it('waits for the current request before scheduling the next poll', async () => {
    vi.useFakeTimers()
    let finishFirst: (() => void) | undefined
    const load = vi.fn<(signal: AbortSignal) => Promise<void>>()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve }))
      .mockResolvedValue(undefined)

    renderHook(() => usePolling(load, 1000))
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(load).toHaveBeenCalledTimes(1)

    await act(async () => { finishFirst?.() })
    await act(async () => { await vi.advanceTimersByTimeAsync(999) })
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('allows a one-off manual refresh while automatic polling is disabled', async () => {
    vi.useFakeTimers()
    const load = vi.fn<(signal: AbortSignal) => Promise<void>>().mockResolvedValue(undefined)
    const { result } = renderHook(() => usePolling(load, 1000, false))

    expect(load).not.toHaveBeenCalled()
    await act(async () => { result.current(); await Promise.resolve() })
    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('aborts an in-flight request before a manual refresh', async () => {
    const signals: AbortSignal[] = []
    const load = vi.fn<(signal: AbortSignal) => Promise<void>>((signal) => {
      signals.push(signal)
      return new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }))
    })
    const { result, unmount } = renderHook(() => usePolling(load, 1000))

    expect(load).toHaveBeenCalledTimes(1)
    await act(async () => { result.current(); await Promise.resolve() })
    expect(signals[0].aborted).toBe(true)
    expect(load).toHaveBeenCalledTimes(2)
    unmount()
    expect(signals[1].aborted).toBe(true)
  })
})
