// Four operator-focused metrics. A missing snapshot renders as loading/unavailable
// instead of misleading zeroes.

type Card = { label: string; value: number | null; sub: string; danger: boolean }

const LABELS = ['Total events', 'Written to Xcenter', 'Errors', 'In progress'] as const

function buildCards(metrics: Record<string, number> | null, unavailable: boolean): Card[] {
  if (!metrics) {
    const sub = unavailable ? 'unavailable' : 'loading…'
    return LABELS.map((label) => ({ label, value: null, sub, danger: false }))
  }

  const total = Object.values(metrics).reduce((sum, value) => sum + value, 0)
  const written = metrics.WRITTEN ?? 0
  const partial = metrics.PARTIAL ?? 0
  const failed = metrics.FAILED ?? 0
  const inflight = (metrics.RECEIVED ?? 0) + (metrics.PROCESSING ?? 0) +
    (metrics.WRITING ?? 0) + (metrics.PENDING_WRITE ?? 0)

  return [
    { label: LABELS[0], value: total, sub: 'all time', danger: false },
    { label: LABELS[1], value: written, sub: partial > 0 ? `+${partial} partial` : 'all', danger: false },
    { label: LABELS[2], value: failed, sub: 'failed batches', danger: failed > 0 },
    { label: LABELS[3], value: inflight, sub: 'received → pending write', danger: false },
  ]
}

export function MetricCards({ metrics, unavailable = false }: {
  metrics: Record<string, number> | null
  unavailable?: boolean
}) {
  return (
    <dl aria-busy={metrics === null && !unavailable} className="m-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
      {buildCards(metrics, unavailable).map((metric) => (
        <div key={metric.label} className="bg-surface border border-border rounded-xl px-[18px] py-4 flex flex-col gap-1.5 min-w-0">
          <dt className="text-[12px] text-muted font-medium">{metric.label}</dt>
          <dd className={'m-0 text-[28px] font-bold tracking-tight font-mono ' + (metric.danger ? 'text-danger' : 'text-fg')}>
            {metric.value ?? '—'}
          </dd>
          <div className={'text-[11px] ' + (metric.danger ? 'text-danger' : 'text-faint')}>{metric.sub}</div>
        </div>
      ))}
    </dl>
  )
}
