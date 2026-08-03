// Panel TRÁI: danh sách field nguồn trong JSON của HQ.
// Kéo một field sang panel phải, hoặc click chọn rồi click vào cột đích (click-to-map).

import { useEffect, useRef, useState } from 'react'
import { PlusIcon, XIcon, CheckIcon } from '../icons'

export function SourcePanel({
  sources, usedFields, removableFields, selectedSrc, searchText,
  onSelect, onDragStart, onDragEnd, onAddSource, onRemoveSource,
}: {
  sources: string[]
  usedFields: Set<string>
  removableFields: Set<string>
  selectedSrc: string | null
  searchText: string
  onSelect: (field: string | null) => void
  onDragStart: (field: string) => void
  onDragEnd: () => void
  onAddSource: (field: string) => boolean
  onRemoveSource: (field: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newSrc, setNewSrc] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function submitNewSource() {
    if (!onAddSource(newSrc)) return
    setNewSrc('')
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
        <div className="font-semibold text-[13px]">Source</div>
        <div className="text-[12px] text-muted">- HQ JSON</div>
        <span className="ml-auto font-mono text-[10px] font-medium text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">JSON</span>
      </div>

      <div className="flex flex-col gap-2">
        {sources.map((source) => {
          const used = usedFields.has(source)
          const selected = selectedSrc === source
          const removable = removableFields.has(source)
          return (
            <div key={source} data-src={source} draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData('text/plain', source)
                onDragStart(source)
                onSelect(null)
              }}
              onDragEnd={onDragEnd}
              className={'flex items-center border rounded-lg relative select-none transition-colors ' +
                (selected ? 'bg-surface border-accent shadow-[0_0_0_3px_var(--accent-weak)]'
                  : used ? 'bg-surface2 border-border hover:border-border2'
                  : 'bg-surface border-border hover:border-border2 hover:bg-surface2')}>
              <button type="button" onClick={() => onSelect(selected ? null : source)} aria-pressed={selected}
                className="flex min-h-10 min-w-0 flex-1 cursor-grab items-center gap-2.5 px-3 py-[9px] text-left">
                <svg width="12" height="16" viewBox="0 0 16 20" fill="currentColor" className="flex-none text-[color:var(--grip)]" aria-hidden="true">
                  <circle cx="6" cy="5" r="1.4" /><circle cx="10" cy="5" r="1.4" /><circle cx="6" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="6" cy="15" r="1.4" /><circle cx="10" cy="15" r="1.4" />
                </svg>
                <span className="font-mono text-[12px] font-medium flex-1 truncate">{source}</span>
                {used && (
                  <span title="in use by a column" className="w-[18px] h-[18px] rounded-full bg-green-bg text-green grid place-items-center flex-none"><CheckIcon size={14} /></span>
                )}
              </button>
              {removable && (
                <button type="button" onClick={(event) => { event.stopPropagation(); onRemoveSource(source) }} title="Remove JSON field"
                  aria-label={`Remove JSON field ${source}`}
                  className="mr-2 grid size-8 flex-none cursor-pointer place-items-center rounded-full text-muted hover:bg-accent-weak hover:text-accent"><XIcon size={14} /></button>
              )}
              <span data-src-anchor={source} className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
                style={{ background: used ? 'var(--green)' : 'var(--border2)' }} />
            </div>
          )
        })}

        {sources.length === 0 && searchText.trim() && (
          <div className="text-[12px] text-muted px-1 py-2">No source fields match "{searchText.trim()}".</div>
        )}

        {adding ? (
          <div className="flex gap-2 items-center p-2.5 border border-dashed border-accent rounded-lg bg-accent-weak">
            <input ref={inputRef} value={newSrc} onChange={(event) => setNewSrc(event.target.value)} placeholder="new_field_name"
              aria-label="New source field"
              onKeyDown={(event) => { if (event.key === 'Enter') submitNewSource() }}
              className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent flex-1 min-w-0" />
            <button type="button" onClick={() => { setAdding(false); setNewSrc('') }} className="text-[12px] text-muted px-2 cursor-pointer">Cancel</button>
            <button type="button" onClick={submitNewSource} className="text-[12px] font-semibold text-accent-text bg-accent px-3 py-1 rounded-md cursor-pointer">Add</button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-border2 rounded-lg text-muted text-[12px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors">
            <PlusIcon /> Add source field
          </button>
        )}
      </div>
    </div>
  )
}
