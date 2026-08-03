// Trang danh sách batch: lọc theo trạng thái + tìm theo batch_id, làm tươi 5 giây một lần.

import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import type { EventPage } from '../../types'
import { fetchEventPage } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { SearchIcon } from '../../components/icons'
import { FilterTabs } from '../../components/FilterTabs'
import { EventsTable } from '../../components/events/EventsTable'
import { ErrorBlock, LoadingBlock, StaleBanner } from '../../components/AsyncState'

export const Route = createFileRoute('/events/')({ component: EventsPage })

const REFRESH_MS = 5000
const PAGE_SIZE = 50
const STATUS_TABS = ['all', 'RECEIVED', 'PROCESSING', 'WRITING', 'PENDING_WRITE', 'WRITTEN', 'PARTIAL', 'FAILED']

function EventsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<EventPage | null>(null)
  const [resultKey, setResultKey] = useState('')
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const requestKey = `${page}|${statusFilter}|${debouncedSearch}`

  const load = useCallback(async (signal: AbortSignal) => {
    setRefreshing(true)
    try {
      const data = await fetchEventPage({
        page,
        size: PAGE_SIZE,
        status: statusFilter,
        search: debouncedSearch,
        signal,
      })
      const lastPage = Math.max(0, data.total_pages - 1)
      if (page > lastPage) {
        setPage(lastPage)
        return
      }
      setResult(data)
      setResultKey(requestKey)
      setError('')
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error')
    } finally {
      if (!signal.aborted) setRefreshing(false)
    }
  }, [page, statusFilter, debouncedSearch, requestKey])
  const refresh = usePolling(load, REFRESH_MS)

  const visibleResult = resultKey === requestKey ? result : null

  function changeStatus(next: string) {
    setStatusFilter(next)
    setPage(0)
  }

  return (
    <div className="px-4 sm:px-7 pt-5 sm:pt-[26px] pb-11 w-full flex flex-col gap-[18px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Events</h1>
        <p className="mt-[5px] text-[13px] text-muted">Every price event, received to written.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <FilterTabs tabs={STATUS_TABS} active={statusFilter} onChange={changeStatus} label="Filter events by status" />
        <div className="relative flex-1 min-w-[200px] max-w-[300px] ml-auto">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center">
            <SearchIcon />
          </span>
          <input
            aria-label="Search events by batch ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search batch id…"
            className="w-full py-2 pl-[34px] pr-[11px] border border-border rounded-lg bg-surface text-fg text-[13px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && visibleResult && <StaleBanner message={error} onRetry={refresh} />}
      {!visibleResult && !error && <LoadingBlock label="Loading events…" />}
      {!visibleResult && error && <ErrorBlock message={error} onRetry={refresh} />}
      {visibleResult && (
        <>
          <EventsTable rows={visibleResult.items} />
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-muted">
            <span>
              Showing {visibleResult.items.length} of {visibleResult.total_items}
              {refreshing ? ' · Refreshing…' : ''}
              {' · status covers this system only (received → Xcenter).'}
            </span>
            <div className="flex items-center gap-2" aria-label="Event list pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="min-h-10 px-3 rounded-lg border border-border bg-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface2">
                Previous
              </button>
              <span className="font-mono">Page {visibleResult.page + 1} of {Math.max(1, visibleResult.total_pages)}</span>
              <button type="button" disabled={visibleResult.page + 1 >= visibleResult.total_pages} onClick={() => setPage((value) => value + 1)}
                className="min-h-10 px-3 rounded-lg border border-border bg-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface2">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
