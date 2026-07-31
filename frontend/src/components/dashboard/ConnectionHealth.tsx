// Thẻ "Connection health": API và Database còn sống hay không (đọc từ /api/v1/health).

import type { Health } from '../../types'
import { ServerIcon, FolderIcon } from '../icons'

export function ConnectionHealth({ health }: { health: Health | null }) {
  const rows = [
    { name: 'API', dir: 'HTTP · console', ok: !!health?.api, icon: <ServerIcon size={17} /> },
    { name: 'Database', dir: 'PostgreSQL', ok: !!health?.db, icon: <FolderIcon size={17} /> },
  ]

  return (
    <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3">
      <div className="font-semibold text-[13.5px]">Connection health</div>

      {rows.map((h) => (
        <div key={h.name} className="flex items-center gap-[11px] px-3 py-[11px] border border-border rounded-[10px] bg-surface2">
          <span className="w-[30px] h-[30px] rounded-lg bg-surface border border-border grid place-items-center text-fg flex-none">
            {h.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[12.5px]">{h.name}</div>
            <div className="text-[11px] text-muted">{h.dir}</div>
          </div>
          <span className={'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap ' +
            (h.ok ? 'text-green bg-green-bg' : 'text-accent bg-accent-weak')}>
            <span className={'w-1.5 h-1.5 rounded-full ' + (h.ok ? 'bg-green' : 'bg-accent')} />
            {h.ok ? 'OK' : 'Down'}
          </span>
        </div>
      ))}

      {/* mt-auto đẩy dòng này xuống đáy thẻ cho bằng chiều cao với biểu đồ bên cạnh */}
      <div className="text-[11px] text-faint mt-auto leading-relaxed">
        Store delivery is handled by Xstore - out of scope.
      </div>
    </div>
  )
}
