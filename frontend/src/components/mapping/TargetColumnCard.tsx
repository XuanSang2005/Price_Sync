// Một thẻ "cột MNT" ở panel phải: số thứ tự, tên cột, field nguồn đang gắn, và hàng chỉnh luật.
// Hai loại cột:
//   - locked (cột chuẩn, hợp đồng Oracle): chỉ xem, không đổi nguồn / không đổi luật / không xoá.
//   - cột động (người dùng tự thêm): sửa thoải mái.

import { XIcon, ChevronUpIcon, ChevronDownIcon } from '../icons'
import type { Col } from '../../lib/mappingRules'

// Màu nhãn theo loại luật
function ruleTagCls(ruleType: string) {
  const byType: Record<string, string> = {
    DIRECT: 'text-muted bg-surface2', DEFAULT: 'text-amber bg-amber-bg',
    VALUE_MAP: 'text-fg bg-accent-weak', SPLIT: 'text-green bg-green-bg',
  }
  return byType[ruleType] ?? 'text-muted bg-surface2'
}

export function TargetColumnCard({
  col, index, ruleTypes, isDropTarget, hasSelectedSrc, canMoveUp, canMoveDown,
  onDragOver, onDragLeave, onDrop, onClick, onDoubleClick, onClear, onRemove, onMove, onChangeField,
}: {
  col: Col
  index: number
  ruleTypes: string[]
  isDropTarget: boolean // đang kéo một field lơ lửng ngay trên thẻ này
  hasSelectedSrc: boolean // đang có field được chọn sẵn (chế độ click-to-map)
  canMoveUp: boolean
  canMoveDown: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  onDoubleClick: () => void
  onClear: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onChangeField: (patch: Partial<Col>) => void
}) {
  const locked = col.locked
  // Viền nét đứt = "chỗ này thả được"
  const active = !locked && (isDropTarget || hasSelectedSrc)

  return (
    <div data-tgt={col.key}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      onClick={onClick} onDoubleClick={onDoubleClick}
      title={col.json_field && !locked ? 'Double-click to unmap' : undefined}
      className={'relative flex flex-col gap-2 px-3.5 py-3 border rounded-lg bg-surface transition-[border-color,box-shadow] ' +
        (isDropTarget ? 'border-accent border-[1.5px] shadow-[0_0_0_3px_var(--accent-weak)] bg-accent-weak'
          : active ? 'border-border2 border-dashed' : 'border-border') + (hasSelectedSrc ? ' cursor-pointer' : '')}>

      {/* chấm neo bên trái — đầu kia của đường nối */}
      <span data-tgt-anchor={col.key} className="absolute -left-[6px] top-[22px] w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
        style={{ background: col.json_field ? 'var(--green)' : 'var(--border2)' }} />

      {/* dòng 1-2: vị trí + tên cột MNT + nguồn đang gắn, bên phải là các nút thao tác */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-faint w-5">#{index + 1}</span>
            <span className="font-mono text-[12px] font-medium">{col.mnt_column}</span>
          </div>
          {col.json_field ? (
            <div className="flex items-center gap-1.5 mt-1 ml-7 flex-wrap">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-green bg-green-bg pl-2 pr-1 py-0.5 rounded">
                {col.json_field}
                {!locked && (
                  <button onClick={(e) => { e.stopPropagation(); onClear() }} title="Unmap"
                    className="grid place-items-center rounded-full text-green/60 hover:text-green cursor-pointer"><XIcon size={14} /></button>
                )}
              </span>
              <span className={'text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ' + ruleTagCls(col.rule_type)}>{col.rule_type}</span>
              {/* cột CHUẨN: dồn rule_value + built-in vào ĐÂY để thẻ còn 2 dòng */}
              {locked && col.rule_value && (
                <span title={col.rule_value} className="font-mono text-[10px] text-muted px-1.5 py-0.5 border border-border rounded bg-surface2 truncate max-w-[160px]">{col.rule_value}</span>
              )}
              {locked && (
                <span title="Standard column (Oracle contract) - config fixed"
                  className="font-mono text-[9px] text-faint px-1.5 py-0.5 border border-border rounded bg-surface2 whitespace-nowrap select-none">built-in</span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-amber mt-1 ml-7">drop a source field here</div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-none">
          <button onClick={(e) => { e.stopPropagation(); onMove(-1) }} disabled={!canMoveUp} title="Move up"
            className={'w-5 h-5 grid place-items-center rounded ' + (canMoveUp ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}><ChevronUpIcon size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1) }} disabled={!canMoveDown} title="Move down"
            className={'w-5 h-5 grid place-items-center rounded ' + (canMoveDown ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}><ChevronDownIcon size={14} /></button>
          {locked ? (
            <span title="Standard column (Oracle contract) - locked: source & column fixed" className="w-5 h-5 grid place-items-center text-faint cursor-not-allowed">
              {/* ổ khoá vẽ tay bằng SVG (không dùng thư viện icon) */}
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="2.5" y="5.3" width="7" height="4.7" rx="1" /><path d="M4 5.3V4a2 2 0 0 1 4 0v1.3" strokeLinecap="round" /></svg>
            </span>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onRemove() }} title="Remove column"
              className="w-5 h-5 grid place-items-center text-muted hover:text-accent cursor-pointer"><XIcon size={14} /></button>
          )}
        </div>
      </div>

      {/* dòng 3: rule config — CHỈ cột ĐỘNG mới có; cột chuẩn đã dồn hết lên dòng 2 → thẻ 2 dòng */}
      {!locked && (
        <div className="flex items-center gap-2 ml-7 flex-wrap">
          {/* stopPropagation ở mọi ô nhập: nếu không, click vào ô sẽ nổi lên thẻ cha và bị hiểu là "map field đang chọn" */}
          <select value={col.rule_type} onClick={(e) => e.stopPropagation()} onChange={(e) => onChangeField({ rule_type: e.target.value })}
            className="font-mono text-[11px] px-2 py-1 border border-border rounded bg-surface text-fg outline-none focus:border-accent">
            {ruleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {/* chỉ 2 loại luật này mới cần tham số kèm theo */}
          {(col.rule_type === 'DEFAULT' || col.rule_type === 'VALUE_MAP') && (
            <input value={col.rule_value ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onChangeField({ rule_value: e.target.value })}
              placeholder={col.rule_type === 'VALUE_MAP' ? '{"STORE":"S"}' : 'VND'}
              className="font-mono text-[11px] px-2 py-1 border border-border rounded bg-surface text-fg outline-none focus:border-accent flex-1 min-w-[120px]" />
          )}
          <label onClick={(e) => e.stopPropagation()} title="required" className="flex items-center gap-1 text-[11px] text-muted cursor-pointer select-none">
            <input type="checkbox" checked={col.required} onChange={(e) => onChangeField({ required: e.target.checked })} /> required
          </label>
        </div>
      )}
    </div>
  )
}
