// Live health snapshot. Unknown health is kept distinct from a confirmed outage.

import type { Health } from '../../types'
import { ServerIcon, FolderIcon } from '../icons'

export function ConnectionHealth({ health, unavailable = false }: {
  health: Health | null
  unavailable?: boolean
}) {
  const rows = [
    { name: 'API', description: 'HTTP · console', ok: health?.api, icon: <ServerIcon size={17} /> },
    { name: 'Database', description: 'PostgreSQL', ok: health?.db, icon: <FolderIcon size={17} /> },
  ]

  return (
    <section aria-labelledby="connection-health-title" aria-busy={health === null && !unavailable} className="h-full bg-surface border border-border rounded-xl p-4 sm:p-[18px] flex flex-col gap-3">
      <h2 id="connection-health-title" className="m-0 font-semibold text-[13.5px]">Connection health</h2>

      <ul className="m-0 p-0 list-none flex flex-col gap-3">
        {rows.map((row) => {
          const label = row.ok === undefined ? (unavailable ? 'Unavailable' : 'Checking') : row.ok ? 'OK' : 'Down'
          const tone = row.ok === undefined
            ? 'text-muted bg-surface2'
            : row.ok ? 'text-green bg-green-bg' : 'text-danger bg-danger-weak'
          const dot = row.ok === undefined ? 'bg-faint' : row.ok ? 'bg-green' : 'bg-danger'
          return (
            <li key={row.name} className="flex items-center gap-[11px] px-3 py-[11px] border border-border rounded-[10px] bg-surface2">
              <span aria-hidden="true" className="w-[30px] h-[30px] rounded-lg bg-surface border border-border grid place-items-center text-fg flex-none">
                {row.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[12.5px]">{row.name}</span>
                <span className="block text-[11px] text-muted">{row.description}</span>
              </span>
              <span className={'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap ' + tone}>
                <span aria-hidden="true" className={'w-1.5 h-1.5 rounded-full ' + dot} />
                {label}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="text-[11px] text-faint mt-auto leading-relaxed">
        Store delivery is handled by Xstore — out of scope.
      </div>
    </section>
  )
}
