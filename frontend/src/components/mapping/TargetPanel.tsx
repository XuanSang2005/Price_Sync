// Panel đích: thứ tự tại đây chính là thứ tự cột trong file MNT.

import { useEffect, useId, useRef, useState } from 'react'
import { PlusIcon } from '../icons'
import type { Col } from '../../lib/mappingRules'
import { TargetColumnCard } from './TargetColumnCard'

const EMPTY_FORM = { json_field: '', mnt_column: '', required: false, nameEdited: false }

export function TargetPanel({
  cols, recordType, ruleTypes, selectedSrc, dragSrc, removedColumnName,
  onMapSource, onClearCol, onRemoveCol, onUndoRemove,
  onMoveCol, onChangeCol, onAddColumn, onDragEnd,
}: {
  cols: Col[]
  recordType: string
  ruleTypes: string[]
  selectedSrc: string | null
  dragSrc: string | null
  removedColumnName: string | null
  onMapSource: (colKey: string, sourceField: string) => void
  onClearCol: (colKey: string) => void
  onRemoveCol: (colKey: string) => void
  onUndoRemove: () => void
  onMoveCol: (index: number, dir: -1 | 1) => void
  onChangeCol: (colKey: string, patch: Partial<Col>) => void
  onAddColumn: (jsonField: string, mntColumn: string, required: boolean) => boolean
  onDragEnd: () => void
}) {
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const headingId = useId()
  const helpId = useId()
  const formId = useId()
  const sourceInputId = useId()
  const targetInputId = useId()
  const targetInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) targetInputRef.current?.focus()
  }, [adding])

  function onJsonFieldChange(value: string) {
    setForm((current) => ({
      ...current,
      json_field: value,
      mnt_column: current.nameEdited ? current.mnt_column : value.trim().toUpperCase().replace(/\s+/g, '_'),
      required: value.trim() ? current.required : false,
    }))
  }

  function closeForm() {
    setForm(EMPTY_FORM)
    setAdding(false)
  }

  function submitNewColumn() {
    if (!onAddColumn(form.json_field, form.mnt_column, form.required)) return
    closeForm()
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
        <h2 id={headingId} className="font-semibold text-[13px]">Target</h2>
        <div className="text-[12px] text-muted">- MNT columns (in order)</div>
        <span className="ml-auto font-mono text-[10px] font-medium text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">{recordType}</span>
      </div>
      <p id={helpId} className="sr-only">
        Choose “Map” after selecting a source, or drop a source onto an unlocked column.
      </p>

      <div className="flex flex-col gap-2" aria-describedby={helpId}>
        {cols.map((column, index) => (
          <TargetColumnCard
            key={column.key}
            col={column}
            index={index}
            ruleTypes={ruleTypes}
            isDropTarget={dragOver === column.key && !!dragSrc}
            isDragging={!!dragSrc}
            selectedSource={selectedSrc}
            canMoveUp={index > 0 && !column.locked && !cols[index - 1].locked}
            canMoveDown={index < cols.length - 1 && !column.locked && !cols[index + 1].locked}
            onDragOver={(event) => {
              if (!dragSrc || column.locked) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
              if (dragOver !== column.key) setDragOver(column.key)
            }}
            onDragLeave={() => setDragOver((current) => current === column.key ? null : current)}
            onDrop={(event) => {
              event.preventDefault()
              if (dragSrc && !column.locked) onMapSource(column.key, dragSrc)
              onDragEnd()
              setDragOver(null)
            }}
            onClick={() => { if (selectedSrc && !column.locked) onMapSource(column.key, selectedSrc) }}
            onClear={() => onClearCol(column.key)}
            onRemove={() => onRemoveCol(column.key)}
            onMove={(direction) => onMoveCol(index, direction)}
            onChangeField={(patch) => onChangeCol(column.key, patch)}
          />
        ))}

        {removedColumnName && (
          <div role="status" aria-live="polite"
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-amber/30 bg-amber-bg text-[12px]">
            <span><span className="font-mono font-semibold">{removedColumnName}</span> removed from this draft.</span>
            <button type="button" onClick={onUndoRemove}
              className="min-h-8 px-3 rounded-md font-semibold text-amber hover:bg-surface cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber">
              Undo
            </button>
          </div>
        )}

        {adding ? (
          <form id={formId} onSubmit={(event) => { event.preventDefault(); submitNewColumn() }}
            className="flex flex-col gap-2.5 p-3 border border-dashed border-accent rounded-lg bg-accent-weak">
            <div className="flex flex-col gap-1">
              <label htmlFor={targetInputId} className="text-[10px] uppercase tracking-wide text-muted font-semibold">
                MNT column <span className="text-faint normal-case font-normal">· required</span>
              </label>
              <input ref={targetInputRef} id={targetInputId} value={form.mnt_column} required aria-required="true"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  mnt_column: event.target.value,
                  nameEdited: event.target.value.trim() !== '',
                }))}
                onKeyDown={(event) => { if (event.key === 'Escape') closeForm() }}
                placeholder="PROMO_CODE"
                className="font-mono text-[12px] min-h-9 px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={sourceInputId} className="text-[10px] uppercase tracking-wide text-muted font-semibold">
                JSON source <span className="text-faint normal-case font-normal">· optional</span>
              </label>
              <input id={sourceInputId} value={form.json_field}
                onChange={(event) => onJsonFieldChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Escape') closeForm() }}
                placeholder="Map later"
                className="font-mono text-[12px] min-h-9 px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <label title={form.json_field.trim() ? undefined : 'Add a JSON source before requiring its value'}
                className={'flex items-center gap-1 min-h-9 text-[12px] select-none ' + (form.json_field.trim() ? 'text-muted cursor-pointer' : 'text-faint cursor-not-allowed')}>
                <input type="checkbox" checked={form.required} disabled={!form.json_field.trim()}
                  onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))} /> Require source value
              </label>
              <span className="text-[11px] text-faint">
                {form.json_field.trim() ? 'rule = DIRECT (edit inline later)' : 'Source can be mapped after adding'}
              </span>
              <div className="flex-1" />
              <button type="button" onClick={closeForm} className="min-h-9 text-[12px] text-muted px-2.5 cursor-pointer">Cancel</button>
              <button type="submit" aria-label="Add target column"
                className="min-h-9 text-[12px] font-semibold text-accent-text bg-accent px-3 rounded-md cursor-pointer">Add</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} aria-expanded={false} aria-controls={formId}
            className="flex items-center justify-center gap-1.5 w-full min-h-10 py-2.5 border border-dashed border-border2 rounded-lg text-muted text-[12px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <PlusIcon /> Add target column
          </button>
        )}
      </div>
    </section>
  )
}
