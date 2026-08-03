// Sơ đồ luồng dữ liệu: HQ → hệ thống này → thư mục Xcenter. Ô giữa được đánh dấu "this system".

import { Fragment } from 'react'
import { ServerIcon, FolderIcon, SyncIcon, ArrowRightIcon } from '../icons'

export function DataFlow({ xcenterPath, connected, checking = false, unavailable = false }: {
  xcenterPath: string
  connected: boolean | null
  checking?: boolean
  unavailable?: boolean
}) {
  // Keep checking/unavailable distinct from a confirmed healthy or failed state.
  const selfBox = unavailable
    ? 'border-[1.5px] border-amber bg-amber-bg relative'
    : connected === null
    ? 'border-[1.5px] border-border bg-surface2 relative'
    : connected
      ? 'border-[1.5px] border-green bg-green-bg relative'
      : 'border-[1.5px] border-accent bg-accent-weak relative'
  const selfSolid = unavailable
    ? 'bg-surface border border-amber text-amber'
    : connected === null
    ? 'bg-surface border border-border text-muted'
    : connected
      ? 'bg-green text-white'
      : 'bg-accent text-accent-text'

  const steps = [
    { title: 'HQ pricing system', sub: 'Head office', icon: <ServerIcon size={20} /> },
    { title: 'Integrator', sub: 'Map & transform → MNT', icon: <SyncIcon size={20} />, self: true },
    { title: 'Xcenter inbound', sub: xcenterPath || 'xcenter-inbound', icon: <FolderIcon size={20} /> },
  ]

  return (
    <section aria-labelledby="data-flow-heading" className="bg-surface border border-border rounded-2xl px-6 pt-6 pb-5">
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <h2 id="data-flow-heading" className="m-0 font-semibold text-sm">Data flow</h2>
        <div className="text-[12px] text-muted">HQ price event → MNT file in Xcenter inbound</div>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto pt-3 pb-1">
        {steps.map((s, i) => (
          // Fragment: mỗi vòng lặp trả về 2 thứ (ô + mũi tên) mà JSX chỉ cho trả 1 gốc
          <Fragment key={i}>
            <div className={'flex-1 rounded-xl p-3.5 flex flex-col gap-2.5 min-w-[150px] ' +
              (s.self ? selfBox : 'border border-border bg-surface2')}>
              {s.self && (
                <span className={'absolute -top-2.5 left-3.5 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide ' + selfSolid}>
                  {unavailable ? 'unavailable' : connected === null ? (checking ? 'checking' : 'unknown') : 'this system'}
                </span>
              )}
              <div className={'w-[38px] h-[38px] rounded-lg grid place-items-center ' +
                (s.self ? selfSolid : 'bg-surface border border-border text-fg')}>
                {s.icon}
              </div>
              <div>
                <div className="font-semibold text-[13px]">{s.title}</div>
                <div className="text-[11px] mt-0.5 break-all text-muted font-mono">{s.sub}</div>
              </div>
            </div>
            {/* mũi tên chỉ nằm GIỮA các ô, sau ô cuối thì thôi */}
            {i < steps.length - 1 && (
              <div className="text-faint flex-none self-center"><ArrowRightIcon size={16} /></div>
            )}
          </Fragment>
        ))}
      </div>

      <div className="mt-4 text-[12px] text-faint">
        Ends at the Xcenter folder · Xstore delivery is out of scope.
      </div>
    </section>
  )
}
