// Trang chi tiết một batch: tiến trình vòng đời, nhật ký, payload gốc, file MNT, danh sách record.
// Mỗi khối là một component trong components/events/; trang này chỉ nạp dữ liệu và xếp thứ tự.

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { EventDetail, EventLog, EventFile } from '../../types'
import { fetchEventDetail, fetchEventLogs, fetchEventFile } from '../../lib/api'
import { buildSteps } from '../../lib/eventStatus'
import { StatusPill } from '../../lib/status'
import { formatTimeDate } from '../../utils/format'
import { RefreshIcon } from '../../components/icons'
import { LifecycleStepper } from '../../components/events/LifecycleStepper'
import { LifecycleLog } from '../../components/events/LifecycleLog'
import { PayloadPanel } from '../../components/events/PayloadPanel'
import { MntFilePanel } from '../../components/events/MntFilePanel'
import { RecordsTable } from '../../components/events/RecordsTable'

export const Route = createFileRoute('/events/$id')({ component: EventDetailPage })

function EventDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<EventDetail | null>(null)
  const [logs, setLogs] = useState<EventLog[]>([])
  const [file, setFile] = useState<EventFile | null>(null)

  const load = useCallback(() => {
    fetchEventDetail(id).then(setDetail).catch(() => {})
    fetchEventLogs(id).then(setLogs).catch(() => {})
    fetchEventFile(id).then(setFile).catch(() => {})
  }, [id])

  useEffect(() => { load() }, [load])

  if (!detail) {
    return <div className="px-7 py-8 text-muted text-sm">Loading…</div>
  }

  // Trạng thái hiện tại cho biết batch đang ở đâu; log cho biết nó ĐÃ ĐI QUA những đâu
  const steps = buildSteps(detail.status, new Set(logs.map((l) => l.status)))

  return (
    <div className="px-7 pt-[26px] pb-11 w-full flex flex-col gap-5">
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
        </div>
        <div className="flex gap-2 flex-none flex-wrap">
          <button onClick={load}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg bg-surface border border-border px-3 py-2 rounded-lg cursor-pointer hover:bg-surface2">
            <RefreshIcon /> Reload
          </button>
        </div>
      </div>

      <LifecycleStepper steps={steps} />
      <LifecycleLog logs={logs} />
      <PayloadPanel detail={detail} />
      <MntFilePanel file={file} />
      <RecordsTable records={detail.records} />
    </div>
  )
}
