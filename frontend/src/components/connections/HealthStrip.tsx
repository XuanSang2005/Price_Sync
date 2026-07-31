// Dải kiểm tra sức khoẻ ở cuối trang Connections.

import type { Health } from '../../types'

export function HealthStrip({ health }: { health: Health | null }) {
  const rows = [
    { name: 'API', ok: !!health?.api },
    { name: 'Database', ok: !!health?.db },
  ]

  return (
    <section className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3">
      <div className="font-semibold text-[13px]">Health (live check)</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        {rows.map((h) => (
          <div key={h.name} className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-lg bg-surface2">
            <span className={'w-2.5 h-2.5 rounded-full ' + (h.ok ? 'bg-green' : 'bg-accent')} />
            <span className="text-[12px] font-medium flex-1">{h.name}</span>
            <span className={'text-[11px] font-semibold ' + (h.ok ? 'text-green' : 'text-accent')}>{h.ok ? 'OK' : 'Down'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
