// Trang danh sách batch: lọc theo trạng thái + tìm theo batch_id, làm tươi 5 giây một lần.

import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import type { EventSummary } from '../../types'
import { fetchEvents } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { newestFirst } from '../../lib/eventStatus'
import { SearchIcon } from '../../components/icons'
import { FilterTabs } from '../../components/FilterTabs'
import { EventsTable } from '../../components/events/EventsTable'

export const Route = createFileRoute('/events/')({ component: EventsPage })

const REFRESH_MS = 5000

function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    fetchEvents().then(setEvents).catch(() => {})
  }, [])
  usePolling(load, REFRESH_MS)

  // Chỉ hiện tab của những trạng thái ĐANG CÓ trong dữ liệu (Set = bỏ trùng)
  const tabs = ['all', ...new Set(events.map((e) => e.status))]

  const query = search.trim().toLowerCase()
  const rows = newestFirst(events)
    .filter((e) => statusFilter === 'all' || e.status === statusFilter)
    .filter((e) => !query || e.batch_id.toLowerCase().includes(query))

  return (
    <div className="px-7 pt-[26px] pb-11 w-full flex flex-col gap-[18px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Events</h1>
        <p className="mt-[5px] text-[13px] text-muted">Every price event, received to written.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} />
        <div className="relative flex-1 min-w-[200px] max-w-[300px] ml-auto">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center">
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch id…"
            className="w-full py-2 pl-[34px] pr-[11px] border border-border rounded-lg bg-surface text-fg text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      <EventsTable rows={rows} />

      <div className="text-[12px] text-faint">
        Showing {rows.length} of {events.length} · status covers this system only (received → Xcenter).
      </div>
    </div>
  )
}
