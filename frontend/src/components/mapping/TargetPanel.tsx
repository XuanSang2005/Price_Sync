// Panel PHẢI: các cột của file MNT, xếp đúng thứ tự sẽ ghi ra file (trên xuống dưới).
// Panel giữ state kéo-thả cục bộ + form thêm cột; việc sửa dữ liệu do useMappingDraft lo.

import { useState } from 'react'
import { PlusIcon } from '../icons'
import type { Col } from '../../lib/mappingRules'
import { TargetColumnCard } from './TargetColumnCard'

const EMPTY_FORM = { json_field: '', mnt_column: '', required: false, nameEdited: false }

export function TargetPanel({
  cols, recordType, ruleTypes, selectedSrc, dragSrc,
  onMapSource, onClearCol, onUnmapByDoubleClick, onRemoveCol, onMoveCol, onChangeCol, onAddColumn, onDragEnd,
}: {
  cols: Col[]
  recordType: string
  ruleTypes: string[]
  selectedSrc: string | null // field đang chọn ở panel trái (chế độ click-to-map)
  dragSrc: string | null // field đang được kéo
  onMapSource: (colKey: string, sourceField: string) => void
  onClearCol: (colKey: string) => void
  onUnmapByDoubleClick: (colKey: string) => void
  onRemoveCol: (colKey: string) => void
  onMoveCol: (index: number, dir: -1 | 1) => void
  onChangeCol: (colKey: string, patch: Partial<Col>) => void
  onAddColumn: (jsonField: string, mntColumn: string, required: boolean) => boolean
  onDragEnd: () => void
}) {
  const [dragOver, setDragOver] = useState<string | null>(null) // key của cột đang bị kéo lơ lửng bên trên
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Gõ JSON field → tự sinh tên MNT (UPPERCASE). Ngừng sync khi user tự sửa tên MNT.
  function onJsonFieldChange(value: string) {
    setForm((f) => ({
      ...f,
      json_field: value,
      mnt_column: f.nameEdited ? f.mnt_column : value.trim().toUpperCase().replace(/\s+/g, '_'),
    }))
  }

  function submitNewColumn() {
    if (!onAddColumn(form.json_field, form.mnt_column, form.required)) return // sai -> giữ form để sửa
    setForm(EMPTY_FORM)
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border">
        <div className="font-semibold text-[13px]">Target</div>
        <div className="text-[12px] text-muted">- MNT columns (in order)</div>
        <span className="ml-auto font-mono text-[10px] font-medium text-muted bg-surface2 border border-border px-1.5 py-0.5 rounded">{recordType}</span>
      </div>

      <div className="flex flex-col gap-2">
        {cols.map((c, i) => (
          <TargetColumnCard
            key={c.key}
            col={c}
            index={i}
            ruleTypes={ruleTypes}
            // kèm !!dragSrc: thả xong ở chỗ khác thì dragOver cũ (nếu còn sót) cũng không sáng nhầm
            isDropTarget={dragOver === c.key && !!dragSrc}
            hasSelectedSrc={!!selectedSrc}
            // Cột chuẩn không đổi vị trí; cột động cũng không được chen QUA một cột chuẩn.
            canMoveUp={i > 0 && !c.locked && !cols[i - 1].locked}
            canMoveDown={i < cols.length - 1 && !c.locked && !cols[i + 1].locked}
            onDragOver={(e) => {
              if (!dragSrc || c.locked) return
              e.preventDefault() // không preventDefault thì trình duyệt KHÔNG cho thả
              if (dragOver !== c.key) setDragOver(c.key)
            }}
            onDragLeave={() => setDragOver((d) => (d === c.key ? null : d))}
            onDrop={(e) => {
              e.preventDefault()
              if (dragSrc) onMapSource(c.key, dragSrc)
              onDragEnd()
              setDragOver(null)
            }}
            onClick={() => { if (selectedSrc) onMapSource(c.key, selectedSrc) }}
            onDoubleClick={() => { if (!selectedSrc && c.json_field && !c.locked) onUnmapByDoubleClick(c.key) }}
            onClear={() => onClearCol(c.key)}
            onRemove={() => onRemoveCol(c.key)}
            onMove={(dir) => onMoveCol(i, dir)}
            onChangeField={(patch) => onChangeCol(c.key, patch)}
          />
        ))}

        {adding ? (
          <div className="flex flex-col gap-2.5 p-3 border border-dashed border-accent rounded-lg bg-accent-weak">
            {/* Nhập JSON field — MNT (tên + kiểu) tự sinh bên dưới, vẫn sửa được */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wide text-muted font-semibold">JSON field</label>
              <input value={form.json_field} onChange={(e) => onJsonFieldChange(e.target.value)} placeholder="promo_code" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') submitNewColumn() }}
                className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wide text-muted font-semibold">MNT column <span className="text-faint normal-case font-normal">· auto</span></label>
              <input value={form.mnt_column} onChange={(e) => setForm((f) => ({ ...f, mnt_column: e.target.value, nameEdited: e.target.value.trim() !== '' }))} placeholder="PROMO_CODE"
                className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <label className="flex items-center gap-1 text-[12px] text-muted cursor-pointer select-none">
                <input type="checkbox" checked={form.required} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} /> required
              </label>
              <span className="text-[11px] text-faint">rule = DIRECT (edit inline later)</span>
              <div className="flex-1" />
              <button onClick={() => { setAdding(false); setForm(EMPTY_FORM) }}
                className="text-[12px] text-muted px-2.5 py-1 cursor-pointer">Cancel</button>
              <button onClick={submitNewColumn} className="text-[12px] font-semibold text-accent-text bg-accent px-3 py-1 rounded-md cursor-pointer">Add</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-border2 rounded-lg text-muted text-[12px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors">
            <PlusIcon /> Add target column
          </button>
        )}
      </div>
    </div>
  )
}
