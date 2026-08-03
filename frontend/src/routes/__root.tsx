// Shared shell: navigation drawer, application header, and lightweight health /
// attention polling. The shell never downloads the full event history.

import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventSummary, Health } from '../types'
import { fetchEventAttention, fetchHealth } from '../lib/api'
import { usePolling } from '../lib/usePolling'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'

export const Route = createRootRoute({ component: RootLayout })

const REFRESH_MS = 10000
function RootLayout() {
  const [attention, setAttention] = useState<EventSummary[]>([])
  const [attentionCount, setAttentionCount] = useState<number | null>(null)
  const [alertsUnavailable, setAlertsUnavailable] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [healthUnavailable, setHealthUnavailable] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    await Promise.all([
      fetchEventAttention(signal)
        .then((snapshot) => {
          setAttention(snapshot.events)
          setAttentionCount(snapshot.count)
          setAlertsUnavailable(false)
        })
        .catch(() => {
          if (!signal?.aborted) setAlertsUnavailable(true)
        }),
      fetchHealth(signal)
        .then((snapshot) => {
          setHealth(snapshot)
          setHealthUnavailable(false)
        })
        .catch(() => {
          if (!signal?.aborted) setHealthUnavailable(true)
        }),
    ])
  }, [])
  usePolling(load, REFRESH_MS)

  // The drawer behaves as a modal: background content is removed from both the
  // keyboard and accessibility trees until it closes.
  useEffect(() => {
    const main = mainRef.current
    if (!main) return
    main.inert = menuOpen
    if (menuOpen) main.setAttribute('aria-hidden', 'true')
    else main.removeAttribute('aria-hidden')
    return () => {
      main.inert = false
      main.removeAttribute('aria-hidden')
    }
  }, [menuOpen])

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeNotifications = useCallback(() => setNotifOpen(false), [])
  const toggleMenu = useCallback(() => {
    setNotifOpen(false)
    setMenuOpen((open) => !open)
  }, [])
  const toggleNotifications = useCallback(() => {
    setMenuOpen(false)
    setNotifOpen((open) => !open)
  }, [])

  const connected = health === null ? null : !!health.api && !!health.db

  return (
    <div className="min-h-[100dvh] bg-bg text-fg font-sans text-sm">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[60] -translate-y-20 focus:translate-y-0 rounded-lg bg-surface border border-border px-4 py-2 font-semibold text-fg shadow-2xl"
      >
        Skip to main content
      </a>
      {menuOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={closeMenu}
          className="fixed inset-0 z-30 border-0 bg-black/35 cursor-default"
        />
      )}

      <Sidebar
        open={menuOpen}
        health={health}
        attentionCount={attentionCount ?? 0}
        onClose={closeMenu}
        onNavigate={closeMenu}
      />

      <main ref={mainRef} className="flex flex-col h-[100dvh]">
        <TopBar
          connected={connected}
          connectionUnavailable={healthUnavailable}
          attention={attention}
          attentionCount={attentionCount}
          alertsUnavailable={alertsUnavailable}
          notifOpen={notifOpen}
          menuOpen={menuOpen}
          onToggleNotif={toggleNotifications}
          onCloseNotif={closeNotifications}
          onToggleMenu={toggleMenu}
        />

        <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
