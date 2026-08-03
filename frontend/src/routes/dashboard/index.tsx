// Dashboard uses one coherent server snapshot plus health. Failures remain
// visible and stale data is preserved instead of being replaced by false zeroes.

import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import type { EventDashboard, Health } from '../../types'
import { fetchEventDashboard, fetchHealth } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { formatTimeDate } from '../../utils/format'
import { MetricCards } from '../../components/dashboard/MetricCards'
import { EventsPerHourChart } from '../../components/dashboard/EventsPerHourChart'
import { ConnectionHealth } from '../../components/dashboard/ConnectionHealth'
import { AttentionList } from '../../components/dashboard/AttentionList'
import { RecentActivity } from '../../components/dashboard/RecentActivity'

export const Route = createFileRoute('/dashboard/')({ component: DashboardPage })

const REFRESH_MS = 10000

function DashboardPage() {
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [dashboardError, setDashboardError] = useState(false)
  const [healthError, setHealthError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const load = useCallback(async (signal: AbortSignal) => {
    await Promise.all([
      fetchEventDashboard(signal)
        .then((snapshot) => {
          setDashboard(snapshot)
          setDashboardError(false)
          setLastUpdated(new Date().toISOString())
        })
        .catch(() => {
          if (!signal.aborted) setDashboardError(true)
        }),
      fetchHealth(signal)
        .then((snapshot) => {
          setHealth(snapshot)
          setHealthError(false)
        })
        .catch(() => {
          if (!signal.aborted) setHealthError(true)
        }),
    ])
  }, [])
  const refresh = usePolling(load, REFRESH_MS)

  const hasError = dashboardError || healthError

  return (
    <div className="px-4 sm:px-6 lg:px-7 pt-5 sm:pt-[26px] pb-11 w-full flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 sm:gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-[5px] mb-0 text-[13.5px] text-muted">Pipeline status up to the Xcenter inbound folder.</p>
        </div>
        <span role="status" aria-live="polite" className="text-[11px] sm:text-[12px] text-muted font-mono">
          {lastUpdated ? `Updated ${formatTimeDate(lastUpdated)}` : 'Waiting for first update…'}
        </span>
      </div>

      {hasError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-danger/50 bg-danger-weak px-4 py-3 text-[12.5px]">
          <span className="text-danger">
            {dashboard || health ? 'Some dashboard data could not be refreshed. Showing the latest available snapshot.' : 'Dashboard data is currently unavailable.'}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 self-start sm:self-auto px-4 rounded-lg border border-border bg-surface text-fg font-semibold cursor-pointer hover:bg-surface2"
          >
            Retry now
          </button>
        </div>
      )}

      <MetricCards metrics={dashboard?.metrics ?? null} unavailable={dashboardError && !dashboard} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="xl:col-span-2 min-w-0">
          <EventsPerHourChart buckets={dashboard?.hourly_events ?? null} unavailable={dashboardError && !dashboard} />
        </div>
        <ConnectionHealth health={health} unavailable={healthError && !health} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <AttentionList
          attention={dashboard?.attention_events ?? null}
          totalCount={dashboard?.attention_count}
          unavailable={dashboardError && !dashboard}
        />
        <RecentActivity recent={dashboard?.recent_events ?? null} unavailable={dashboardError && !dashboard} />
      </div>
    </div>
  )
}
