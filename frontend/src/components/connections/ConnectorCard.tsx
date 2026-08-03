// Compact card for one connector's editable settings.

import { useId, type ReactNode } from 'react'

export function ConnectorCard({ icon, title, note, children }: {
  icon: ReactNode
  title: string
  note: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="min-w-0 bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-8 text-muted grid place-items-center flex-none">{icon}</span>
        <h3 id={headingId} className="m-0 min-w-0 truncate font-semibold text-[13px]">{title}</h3>
      </div>

      {children}

      <div className="min-h-11 mt-auto border-t border-border pt-2.5 text-[10.5px] leading-4 text-faint">
        {note}
      </div>
    </section>
  )
}
