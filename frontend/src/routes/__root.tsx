// Khung chung của mọi trang: sidebar trái + thanh header + vùng nội dung (<Outlet/>).
// Dữ liệu dùng chung (events cho badge cảnh báo, health cho đèn "Connected") nạp ở đây,
// làm tươi 10 giây một lần rồi truyền xuống.

import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useState, useRef, useCallback } from 'react'
import type { EventSummary, Health } from '../types'
import { fetchEvents, fetchHealth } from '../lib/api'
import { usePolling } from '../lib/usePolling'
import { attentionEvents } from '../lib/eventStatus'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'

export const Route = createRootRoute({ component: RootLayout })

const REFRESH_MS = 10000

// Chuột đi từ hamburger sang sidebar có một khoảnh khắc không nằm trên cả hai;
// trễ nhỏ này để khoảnh khắc đó không bị coi là "đã rời ra" rồi đóng sidebar.
const CLOSE_DELAY_MS = 150

// Không gọi được /health thì coi như hệ thống đang hỏng, đừng để đèn xanh gây hiểu nhầm
const HEALTH_WHEN_OFFLINE: Health = {
  status: 'degraded', api: false, db: false, version: 'dev', environment: 'LOCAL', checked_at: '',
}

function RootLayout() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false) // sidebar đang trượt ra hay thu vào

  const load = useCallback(() => {
    fetchEvents().then(setEvents).catch(() => {})
    fetchHealth().then(setHealth).catch(() => setHealth(HEALTH_WHEN_OFFLINE))
  }, [])
  usePolling(load, REFRESH_MS)

  // ===== Mở/đóng sidebar bằng hover =====
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }
  function closeMenu() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), CLOSE_DELAY_MS)
  }

  const attention = attentionEvents(events)
  const connected = !!health?.api && !!health?.db

  return (
    <div className="min-h-screen bg-bg text-fg font-sans text-sm">
      {/* Vùng cảm ứng sát mép trái: rê chuột vào đây cũng mở sidebar (kể cả khi hamburger bị che) */}
      <div onMouseEnter={openMenu} onMouseLeave={closeMenu} className="fixed left-0 top-0 h-screen w-2 z-30" />

      <Sidebar
        open={menuOpen}
        health={health}
        attentionCount={attention.length}
        onOpen={openMenu}
        onClose={closeMenu}
        onNavigate={() => setMenuOpen(false)} />

      {/* Main chiếm trọn bề ngang; sidebar trượt ĐÈ lên khi mở */}
      <main className="flex flex-col h-screen">
        <TopBar
          connected={connected}
          attention={attention}
          notifOpen={notifOpen}
          onToggleNotif={() => setNotifOpen((o) => !o)}
          onCloseNotif={() => setNotifOpen(false)}
          onOpenMenu={openMenu}
          onCloseMenu={closeMenu}
          onToggleMenu={() => setMenuOpen((o) => !o)} />

        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
