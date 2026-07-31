// Panel TRÁI: danh sách field nguồn trong JSON của HQ.
// Kéo một field sang panel phải, hoặc click chọn rồi click vào cột đích (click-to-map).

import { useState } from 'react'
import { PlusIcon, XIcon, CheckIcon } from '../icons'

export function SourcePanel({
  sources, usedFields, customSources, selectedSrc, searchText,
  onSelect, onDragStart, onDragEnd, onAddSource, onRemoveSource,
}: {
  sources: string[] // các field đã lọc theo ô tìm kiếm
  usedFields: Set<string> // field đang được ít nhất một cột dùng
  customSources: string[] // field do người dùng tự khai (mới xoá được)
  selectedSrc: string | null
  searchText: string
  onSelect: (field: string | null) => void
  onDragStart: (field: string) => void
  onDragEnd: () => void
  onAddSource: (field: string) => boolean // trả về false nếu tên không hợp lệ -> giữ form mở
  onRemoveSource: (field: string) => void
}) {
  // State của ô "thêm field" chỉ dùng trong panel này nên để luôn tại đây
  const [adding, setAdding] = useState(false)
  const [newSrc, setNewSrc] = useState('')

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
        {sources.map((s) => {
          const used = usedFields.has(s)
          const selected = selectedSrc === s
          const custom = customSources.includes(s)
          return (
            <div key={s} data-src={s} draggable
              onDragStart={() => { onDragStart(s); onSelect(null) }}
              onDragEnd={onDragEnd}
              onClick={() => onSelect(selected ? null : s)}
              className={'flex items-center gap-2.5 px-3 py-[9px] border rounded-lg relative select-none transition-colors cursor-grab ' +
                (selected ? 'bg-surface border-accent shadow-[0_0_0_3px_var(--accent-weak)]'
                  : used ? 'bg-surface2 border-border hover:border-border2'
                  : 'bg-surface border-border hover:border-border2 hover:bg-surface2')}>
              {/* tay nắm 6 chấm — gợi ý "kéo được" */}
              <svg width="12" height="16" viewBox="0 0 16 20" fill="currentColor" className="flex-none text-[color:var(--grip)]">
                <circle cx="6" cy="5" r="1.4" /><circle cx="10" cy="5" r="1.4" /><circle cx="6" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="6" cy="15" r="1.4" /><circle cx="10" cy="15" r="1.4" />
              </svg>
              <span className="font-mono text-[12px] font-medium flex-1 truncate">{s}</span>
              {used ? (
                <span title="in use by a column" className="w-[18px] h-[18px] rounded-full bg-green-bg text-green grid place-items-center flex-none"><CheckIcon size={14} /></span>
              ) : custom ? (
                <button onClick={(e) => { e.stopPropagation(); onRemoveSource(s) }} title="Remove custom field"
                  className="w-[18px] h-[18px] rounded-full grid place-items-center flex-none text-muted hover:text-accent hover:bg-accent-weak cursor-pointer"><XIcon size={14} /></button>
              ) : null}
              {/* chấm neo — nơi đường nối cắm vào; hook đo toạ độ qua data-src-anchor */}
              <span data-src-anchor={s} className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
                style={{ background: used ? 'var(--green)' : 'var(--border2)' }} />
            </div>
          )
        })}

        {sources.length === 0 && searchText.trim() && (
          <div className="text-[12px] text-muted px-1 py-2">No source fields match "{searchText.trim()}".</div>
        )}

        {adding ? (
          <div className="flex gap-2 items-center p-2.5 border border-dashed border-accent rounded-lg bg-accent-weak">
            <input value={newSrc} onChange={(e) => setNewSrc(e.target.value)} placeholder="new_field_name" autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') submitNewSource() }}
              className="font-mono text-[12px] px-2.5 py-1.5 border border-border rounded bg-surface text-fg outline-none focus:border-accent flex-1 min-w-0" />
            <button onClick={() => { setAdding(false); setNewSrc('') }} className="text-[12px] text-muted px-2 cursor-pointer">Cancel</button>
            <button onClick={submitNewSource} className="text-[12px] font-semibold text-accent-text bg-accent px-3 py-1 rounded-md cursor-pointer">Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 border border-dashed border-border2 rounded-lg text-muted text-[12px] font-medium cursor-pointer hover:border-accent hover:text-accent hover:bg-accent-weak transition-colors">
            <PlusIcon /> Add source field
          </button>
        )}
      </div>
    </div>
  )
}
