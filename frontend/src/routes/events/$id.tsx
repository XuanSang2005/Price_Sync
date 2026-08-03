// Trang chi tiết một batch: tiến trình vòng đời, nhật ký, payload gốc, file MNT, danh sách record.
// Mỗi khối là một component trong components/events/; trang này chỉ nạp dữ liệu và xếp thứ tự.

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { EventDetail, EventLog, EventFile } from '../../types'
import { ApiError, fetchEventDetail, fetchEventProgress, fetchEventLogs, fetchEventFile, retryEvent } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { buildSteps } from '../../lib/eventStatus'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { RefreshIcon } from '../../components/icons'
import { LifecycleStepper } from '../../components/events/LifecycleStepper'
import { LifecycleLog } from '../../components/events/LifecycleLog'
import { PayloadPanel } from '../../components/events/PayloadPanel'
import { MntFilePanel } from '../../components/events/MntFilePanel'
import { RecordsTable } from '../../components/events/RecordsTable'
import { ErrorBlock, LoadingBlock, StaleBanner } from '../../components/AsyncState'

export const Route = createFileRoute('/events/$id')({ component: EventDetailPage })

const REFRESH_MS = 5000
const TERMINAL_STATUSES = new Set(['WRITTEN', 'PARTIAL', 'FAILED'])

function EventDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [logs, setLogs] = useState<EventLog[]>([])
  const [file, setFile] = useState<EventFile | null>(null)
  const [detailError, setDetailError] = useState('')
  const [logsError, setLogsError] = useState('')
  const [fileError, setFileError] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const detailRef = useRef<EventDetail | null>(null)
  const forceFullRefreshRef = useRef(false)
  const requestSequenceRef = useRef(0)

  useEffect(() => {
    setDetail(null)
    detailRef.current = null
    setLogs([])
    setFile(null)
    setDetailError('')
    setLogsError('')
    setFileError('')
    setInitialLoading(true)
    setActionMessage('')
    setLastUpdated(null)
  }, [id])

  const loadFull = useCallback(async (signal: AbortSignal) => {
    const requestSequence = ++requestSequenceRef.current
    setRefreshing(true)
    const [detailResult, logsResult, fileResult] = await Promise.allSettled([
      fetchEventDetail(id, signal),
      fetchEventLogs(id, signal),
      fetchEventFile(id, signal),
    ])

    if (signal.aborted || requestSequence !== requestSequenceRef.current) return

    if (detailResult.status === 'fulfilled') {
      detailRef.current = detailResult.value
      setDetail(detailResult.value)
      setDetailError('')
      setLastUpdated(new Date())
    } else {
      const reason = detailResult.reason
      const message = reason instanceof ApiError && reason.status === 404
        ? 'This event does not exist or has been removed.'
        : reason instanceof Error ? reason.message : 'Unable to load event detail.'
      setDetailError(message)
    }

    if (logsResult.status === 'fulfilled') {
      setLogs(logsResult.value)
      setLogsError('')
    } else {
      setLogsError(logsResult.reason instanceof Error ? logsResult.reason.message : 'Unable to load lifecycle log.')
    }

    if (fileResult.status === 'fulfilled') {
      setFile(fileResult.value)
      setFileError('')
    } else {
      setFileError(fileResult.reason instanceof Error ? fileResult.reason.message : 'Unable to load generated file.')
    }

    setInitialLoading(false)
    setRefreshing(false)
  }, [id])

  const load = useCallback(async (signal: AbortSignal) => {
    const current = detailRef.current
    const forceFullRefresh = forceFullRefreshRef.current
    forceFullRefreshRef.current = false

    if (!current || forceFullRefresh) {
      await loadFull(signal)
      return
    }

    setRefreshing(true)
    try {
      const progress = await fetchEventProgress(id, signal)
      if (signal.aborted) return

      const changed = progress.status !== current.status
        || progress.retry_count !== current.retry_count
        || progress.retryable !== current.retryable
        || progress.output_file !== current.output_file

      if (changed && TERMINAL_STATUSES.has(progress.status)) {
        // Fetch records, logs, and the generated file once when processing
        // reaches a terminal state; ordinary 5-second polls remain lightweight.
        await loadFull(signal)
        return
      }

      if (changed) {
        const updated = { ...current, ...progress }
        detailRef.current = updated
        setDetail(updated)
        try {
          setLogs(await fetchEventLogs(id, signal))
          setLogsError('')
        } catch (logError) {
          if (!signal.aborted) {
            setLogsError(logError instanceof Error ? logError.message : 'Unable to load lifecycle log.')
          }
        }
      }

      setDetailError('')
      setLastUpdated(new Date())
    } catch (loadError) {
      if (!signal.aborted) {
        setDetailError(loadError instanceof Error ? loadError.message : 'Unable to refresh event status.')
      }
    } finally {
      if (!signal.aborted) setRefreshing(false)
    }
  }, [id, loadFull])

  const shouldPoll = !detail || !TERMINAL_STATUSES.has(detail.status)
  const refresh = usePolling(load, REFRESH_MS, shouldPoll)

  const reload = useCallback(() => {
    forceFullRefreshRef.current = true
    refresh()
  }, [refresh])

  async function handleRetry() {
    if (!detail || !confirm(`Retry failed batch ${detail.batch_id}?`)) return
    setRetrying(true)
    setActionMessage('')
    try {
      const accepted = await retryEvent(id)
      setActionMessage(accepted ? 'Retry accepted. The event will refresh automatically.' : 'This event is no longer failed.')
      reload()
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Retry failed.')
    } finally {
      setRetrying(false)
    }
  }

  if (initialLoading && !detail) {
    return <div className="px-4 sm:px-7 py-8"><LoadingBlock label="Loading event detail…" /></div>
  }

  if (!detail) {
    return <div className="px-4 sm:px-7 py-8"><ErrorBlock message={detailError || 'Unable to load event detail.'} onRetry={reload} /></div>
  }

  // Trạng thái hiện tại cho biết batch đang ở đâu; log cho biết nó ĐÃ ĐI QUA những đâu
  const steps = buildSteps(detail.status, new Set(logs.map((l) => l.status)))

  return (
    <div className="px-4 sm:px-7 pt-5 sm:pt-[26px] pb-11 w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <button
            onClick={() => navigate({ to: '/events' })}
            className="text-[12px] text-muted hover:text-fg mb-2 cursor-pointer bg-transparent border-none p-0"
          >
            ← Events
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-[16px] font-semibold">{detail.batch_id}</span>
            <span className="font-mono text-[12px] text-muted">v{detail.version}</span>
            <StatusPill status={detail.status} />
          </div>
          <div className="text-[12px] text-muted mt-1.5">
            Received {formatTimeDate(detail.generated_at)} · {detail.records.length} records
            {detail.retry_count > 0 && <> · retried {detail.retry_count}×</>}
          </div>
          {lastUpdated && (
            <div className="text-[11px] text-faint mt-1">
              Updated {formatTimeDate(lastUpdated.toISOString())}{refreshing ? ' · Refreshing…' : ''}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-none flex-wrap">
          {detail.retryable && (
            <button type="button" onClick={handleRetry} disabled={retrying}
              className="inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-semibold text-accent-text bg-primary border border-primary px-4 py-2 rounded-lg disabled:opacity-60 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {retrying ? 'Retrying…' : 'Retry batch'}
            </button>
          )}
          <button type="button" onClick={reload} disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-1.5 text-[12.5px] font-medium text-fg bg-surface border border-border px-3 py-2 rounded-lg disabled:opacity-60 hover:bg-surface2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <RefreshIcon /> {refreshing ? 'Reloading…' : 'Reload'}
          </button>
        </div>
      </div>

      {detailError && <StaleBanner message={detailError} onRetry={reload} />}
      {actionMessage && <div role="status" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">{actionMessage}</div>}
      <LifecycleStepper steps={steps} />
      {logsError ? <SectionError title="Lifecycle log" message={logsError} onRetry={reload} /> : <LifecycleLog logs={logs} />}
      <PayloadPanel detail={detail} />
      {fileError ? <SectionError title="Generated MNT file" message={fileError} onRetry={reload} /> : <MntFilePanel file={file} />}
      <RecordsTable records={detail.records} />
    </div>
  )
}

function SectionError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-danger bg-danger-weak px-4 py-4" role="alert">
      <div className="font-semibold text-sm text-danger">{title} unavailable</div>
      <div className="text-xs text-muted mt-1">{message}</div>
      <button type="button" onClick={onRetry} className="mt-3 min-h-10 px-3 rounded-lg border border-border bg-surface text-xs font-semibold hover:bg-surface2">
        Retry
      </button>
    </section>
  )
}
