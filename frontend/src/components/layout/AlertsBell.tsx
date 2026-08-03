// Alerts popover: viewport-safe on phones, keyboard accessible, and dismissible
// with outside click, focus leaving the control, or Escape.

import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { EventSummary } from '../../types'
import { StatusDot } from '../../lib/status'
import { BellIcon } from '../icons'

const MAX_ROWS = 6

export function AlertsBell({
  attention,
  totalCount = attention.length,
  unavailable = false,
  open,
  onToggle,
  onClose,
}: {
  attention: EventSummary[]
  totalCount?: number | null
  unavailable?: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const count = totalCount ?? attention.length
  const loading = totalCount === null && !unavailable

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')?.focus()
    })
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  function goToEvent(id: number) {
    onClose()
    navigate({ to: '/events/$id', params: { id: String(id) } })
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) onClose()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className="touch-target w-10 h-10 rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer relative hover:bg-border"
        title="Alerts"
        aria-label={unavailable ? 'Alerts unavailable' : loading ? 'Alerts loading' : `Alerts, ${count} open`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="alerts-popover"
      >
        <BellIcon size={16} />
        {count > 0 && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-accent-text text-[10.5px] font-bold grid place-items-center border-2 border-surface leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id="alerts-popover"
          role="dialog"
          aria-labelledby="alerts-heading"
          className="fixed inset-x-2 top-[60px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[48px] sm:w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-4.25rem)] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
          style={{ animation: 'fadein .12s ease' }}
        >
          <div className="px-3.5 py-3 border-b border-border flex justify-between items-center">
            <h2 id="alerts-heading" className="m-0 text-[13px] font-semibold">Alerts</h2>
            <span className="text-[11px] text-muted font-medium">{unavailable ? 'Unavailable' : loading ? 'Loading' : `${count} open`}</span>
          </div>

          {unavailable ? (
            <div role="alert" className="px-3.5 py-5 text-[12.5px] text-danger text-center">
              Alerts could not be refreshed. Try again shortly.
            </div>
          ) : loading ? (
            <div role="status" className="px-3.5 py-5 text-[12.5px] text-muted text-center">Loading alerts…</div>
          ) : attention.length === 0 ? (
            <div className="px-3.5 py-5 text-[12.5px] text-muted text-center">All clear.</div>
          ) : (
            <ul className="m-0 p-0 list-none overflow-y-auto">
              {attention.slice(0, MAX_ROWS).map((event) => (
                <li key={event.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => goToEvent(event.id)}
                    className="w-full min-h-[52px] px-3.5 py-[11px] border-0 bg-transparent text-fg text-left cursor-pointer flex gap-2.5 items-start hover:bg-surface2"
                    aria-label={`View batch ${event.batch_id}, status ${event.status}`}
                  >
                    <span className="mt-1"><StatusDot status={event.status} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-medium truncate">{event.batch_id}</span>
                      <span className="block text-[11px] text-muted font-mono">{event.status}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => { onClose(); navigate({ to: '/events' }) }}
            className="w-full min-h-11 mt-auto px-3.5 py-2.5 border-0 border-t border-border bg-surface text-[12px] text-primary font-semibold cursor-pointer text-center hover:bg-surface2"
          >
            View all events
          </button>
        </div>
      )}
    </div>
  )
}
