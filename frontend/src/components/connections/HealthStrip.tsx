// Dải kiểm tra sức khoẻ ở cuối trang Connections.

import type { Health } from '../../types'

export function HealthStrip({ health, loading, error, onRetry }: {
  health: Health | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const currentHealth = loading || error ? null : health
  const rows = [
    { name: 'API', ok: currentHealth?.api },
    { name: 'Database', ok: currentHealth?.db },
  ]

  return (
    <section aria-labelledby="live-health-heading" className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="live-health-heading" className="m-0 font-semibold text-[13px]">Health (live check)</h2>
        {loading && <span role="status" className="text-[11px] text-muted">Checking…</span>}
      </div>
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-accent bg-accent-weak px-3 py-2 text-[11px] text-accent">
          <span>Health check failed: {error}</span>
          <button type="button" onClick={onRetry} className="min-h-8 px-2 font-semibold bg-transparent border-none text-accent cursor-pointer">Retry</button>
        </div>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        {rows.map((h) => (
          <div key={h.name} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-surface2">
            <span className={'w-2.5 h-2.5 rounded-full ' + (h.ok === undefined ? 'bg-faint' : h.ok ? 'bg-green' : 'bg-accent')} />
            <span className="text-[12px] font-medium flex-1">{h.name}</span>
            <span className={'text-[11px] font-semibold ' + (h.ok === undefined ? 'text-muted' : h.ok ? 'text-green' : 'text-accent')}>
              {h.ok === undefined ? (loading ? 'Checking' : error ? 'Unavailable' : 'Unknown') : h.ok ? 'OK' : 'Down'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
