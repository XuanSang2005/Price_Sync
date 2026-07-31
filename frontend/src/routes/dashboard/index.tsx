// Dashboard: nhìn một cái là biết đêm qua chạy có êm không.
// Trang chỉ nạp dữ liệu (5 giây một lần) rồi chia cho các thẻ trong components/dashboard/.

import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import type { EventSummary, Health } from '../../types'
import { fetchEvents, fetchMetrics, fetchHealth } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { attentionEvents, newestFirst } from '../../lib/eventStatus'
import { formatTimeDate } from '../../utils/format'
import { MetricCards } from '../../components/dashboard/MetricCards'
import { EventsPerHourChart } from '../../components/dashboard/EventsPerHourChart'
import { ConnectionHealth } from '../../components/dashboard/ConnectionHealth'
import { AttentionList } from '../../components/dashboard/AttentionList'
import { RecentActivity } from '../../components/dashboard/RecentActivity'

export const Route = createFileRoute('/dashboard/')({ component: DashboardPage })

const REFRESH_MS = 5000
const RECENT_COUNT = 6

function DashboardPage() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [metrics, setMetrics] = useState<Record<string, number>>({})
  const [health, setHealth] = useState<Health | null>(null)

  const load = useCallback(() => {
    fetchEvents().then(setEvents).catch(() => {})
    fetchMetrics().then(setMetrics).catch(() => {})
    fetchHealth().then(setHealth).catch(() => {})
  }, [])
  usePolling(load, REFRESH_MS)

  return (
    <div className="px-7 pt-[26px] pb-11 w-full flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-[5px] text-[13.5px] text-muted">Pipeline status up to the Xcenter inbound folder.</p>
        </div>
        <span className="text-[12px] text-muted font-mono">
          {health?.checked_at ? 'Updated ' + formatTimeDate(health.checked_at) : (health?.environment ?? '')}
        </span>
      </div>

      <MetricCards metrics={metrics} />

      {/* Biểu đồ rộng gấp đôi thẻ health bên cạnh */}
      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <EventsPerHourChart events={events} />
        <ConnectionHealth health={health} />
      </div>

      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
        <AttentionList attention={attentionEvents(events)} />
        <RecentActivity recent={newestFirst(events).slice(0, RECENT_COUNT)} />
      </div>
    </div>
  )
}
