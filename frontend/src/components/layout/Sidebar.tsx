// Modal navigation drawer. When closed it is inert; when open it traps focus,
// closes on Escape, and returns focus to the control that opened it.

import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import type { Health } from '../../types'
import { GridIcon, BellIcon, LinkIcon, ColumnsIcon, PriceTagIcon, XIcon } from '../icons'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function navClass(active: boolean) {
  return (
    'flex items-center gap-3 min-h-11 px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium cursor-pointer border border-transparent transition-colors ' +
    (active
      ? 'bg-accent-weak text-primary font-semibold'
      : 'text-muted hover:bg-surface2 hover:text-fg')
  )
}

function SectionLabel({ children, topPad = 'pt-1' }: { children: string; topPad?: string }) {
  return (
    <div className={'text-[11px] uppercase tracking-[0.06em] text-faint px-2.5 pb-2 font-semibold ' + topPad}>
      {children}
    </div>
  )
}

export function Sidebar({ open, health, attentionCount, onClose, onNavigate }: {
  open: boolean
  health: Health | null
  attentionCount: number
  onClose: () => void
  onNavigate: () => void
}) {
  const sidebarRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return
    sidebar.inert = !open
    if (!open) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => sidebar.querySelector<HTMLElement>(FOCUSABLE)?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...sidebar.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) {
        event.preventDefault()
        sidebar.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      const previous = previousFocusRef.current
      const returnTarget = previous?.isConnected && previous !== document.body
        ? previous
        : document.getElementById('navigation-menu-button')
      // Root removes `inert` from the application in its own effect cleanup.
      // Restore focus on the next frame so the target is focusable again.
      window.requestAnimationFrame(() => returnTarget?.focus())
    }
  }, [open, onClose])

  return (
    <aside
      ref={sidebarRef}
      id="primary-navigation"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      aria-hidden={!open}
      inert={!open}
      tabIndex={-1}
      className={
        'fixed left-0 top-0 h-[100dvh] w-[248px] max-w-[calc(100vw-2rem)] z-40 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-out ' +
        (open ? 'translate-x-0 shadow-2xl' : '-translate-x-full pointer-events-none')
      }
    >
      <div className="h-14 px-3 border-b border-border flex items-center gap-2">
        <span aria-hidden="true" className="w-8 h-8 text-primary grid place-items-center">
          <PriceTagIcon size={20} />
        </span>
        <span className="flex-1 font-semibold text-[13.5px]">Price Sync</span>
        <button
          type="button"
          onClick={onClose}
          className="touch-target w-10 h-10 rounded-lg border-0 bg-transparent text-muted grid place-items-center cursor-pointer hover:bg-surface2 hover:text-fg"
          aria-label="Close navigation menu"
        >
          <XIcon size={18} />
        </button>
      </div>

      <nav aria-label="Primary" className="px-3 pt-4 pb-3.5 flex flex-col gap-[3px] flex-1 overflow-y-auto">
        <SectionLabel>Monitor</SectionLabel>

        <Link to="/dashboard" className="block rounded-[9px]" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <GridIcon />
              <span>Dashboard</span>
            </div>
          )}
        </Link>

        <Link to="/events" className="block rounded-[9px]" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <BellIcon />
              <span className="flex-1">Events</span>
              {attentionCount > 0 && (
                <span aria-label={`${attentionCount} open alerts`} className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-accent-text text-[10px] font-bold grid place-items-center">
                  {attentionCount > 99 ? '99+' : attentionCount}
                </span>
              )}
            </div>
          )}
        </Link>

        <SectionLabel topPad="pt-4">Configure</SectionLabel>

        <Link to="/connections" className="block rounded-[9px]" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <LinkIcon />
              <span>Connections</span>
            </div>
          )}
        </Link>

        <Link to="/mapping" className="block rounded-[9px]" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <ColumnsIcon />
              <span>Field mapping</span>
            </div>
          )}
        </Link>
      </nav>

      <div className="px-4 py-[13px] border-t border-border text-[11.5px] text-muted flex flex-col gap-[3px]">
        <div>Build {health?.version ?? 'dev'} · {health?.environment ?? 'LOCAL'}</div>
        <div className="font-mono text-[10.5px] text-faint">price-events · v1</div>
      </div>
    </aside>
  )
}
