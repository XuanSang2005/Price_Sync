// Một thẻ "cột MNT" ở panel phải: số thứ tự, tên cột, field nguồn đang gắn, và hàng chỉnh luật.
// Hai loại cột:
//   - locked (cột chuẩn, hợp đồng Oracle): chỉ xem, không đổi nguồn / không đổi luật / không xoá.
//   - cột động (người dùng tự thêm): sửa thoải mái.

import { XIcon, ChevronUpIcon, ChevronDownIcon } from '../icons'
import type { Col } from '../../lib/mappingRules'

const RULE_BADGE_CLASS = 'inline-flex h-6 items-center rounded-md px-2 text-[9px] font-semibold tracking-wide'
const RULE_SELECT_WIDTH: Record<string, string> = {
  DIRECT: 'w-[72px]',
  DEFAULT: 'w-[76px]',
  SPLIT: 'w-[62px]',
  VALUE_MAP: 'w-[88px]',
}

function ruleTagCls(ruleType: string) {
  const byType: Record<string, string> = {
    DIRECT: 'text-muted bg-surface2', DEFAULT: 'text-amber bg-amber-bg',
    VALUE_MAP: 'text-accent bg-accent-weak', SPLIT: 'text-green bg-green-bg',
  }
  return `${RULE_BADGE_CLASS} ${byType[ruleType] ?? 'text-muted bg-surface2'}`
}

function ruleValueLabel(ruleType: string, ruleValue: string): string {
  if (ruleType !== 'VALUE_MAP') return ruleValue
  try {
    const parsed: unknown = JSON.parse(ruleValue)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return ruleValue
    const count = Object.keys(parsed).length
    return `${count} ${count === 1 ? 'value' : 'values'}`
  } catch {
    return ruleValue
  }
}

function valueMapEntries(ruleValue: string): Array<[string, string]> {
  try {
    const parsed: unknown = JSON.parse(ruleValue)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return []
    return Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  } catch {
    return []
  }
}

export function TargetColumnCard({
  col, index, ruleTypes, isDropTarget, isDragging, selectedSource, canMoveUp, canMoveDown,
  onDragOver, onDragLeave, onDrop, onClick, onClear, onRemove, onMove, onChangeField,
}: {
  col: Col
  index: number
  ruleTypes: string[]
  isDropTarget: boolean
  isDragging: boolean
  selectedSource: string | null
  canMoveUp: boolean
  canMoveDown: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  onClear: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onChangeField: (patch: Partial<Col>) => void
}) {
  const locked = col.locked
  const active = !locked && (isDropTarget || !!selectedSource)

  return (
    <div data-tgt={col.key} role="group" aria-label={`Target column ${col.mnt_column}`}
      className={'relative flex min-h-14 items-center gap-2.5 px-3.5 py-2 border rounded-lg bg-surface transition-[border-color,box-shadow] ' +
        (isDropTarget ? 'border-accent border-[1.5px] shadow-[0_0_0_3px_var(--accent-weak)] bg-accent-weak'
          : active ? 'border-border2 border-dashed' : 'border-border') + (selectedSource ? ' cursor-pointer' : '')}>

      {isDragging && !locked && (
        <button type="button" tabIndex={-1} aria-label={`Drop source onto ${col.mnt_column}`}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          className="absolute inset-0 z-20 rounded-lg bg-transparent cursor-copy">
          <span className="sr-only">Drop source onto {col.mnt_column}</span>
        </button>
      )}

      <span data-tgt-anchor={col.key} className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface box-border"
        style={{ background: col.json_field ? 'var(--green)' : 'var(--border2)' }} />

      <div className="flex w-[116px] min-w-0 shrink-0 items-center gap-2">
        <span className="w-5 shrink-0 font-mono text-[10px] text-faint">#{index + 1}</span>
        <span title={col.mnt_column} className="truncate font-mono text-[12px] font-medium">{col.mnt_column}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {col.json_field ? (
          <span className={'inline-flex h-7 min-w-0 max-w-[42%] items-center gap-1 rounded-md border border-green/15 bg-green-bg pl-2 font-mono text-[10px] font-semibold text-green ' + (locked ? 'pr-2' : 'pr-1')}>
            <span title={col.json_field} className="min-w-0 truncate">{col.json_field}</span>
            {!locked && (
              <button type="button" onClick={(event) => { event.stopPropagation(); onClear() }} title="Unmap"
                aria-label={`Unmap source field ${col.json_field} from ${col.mnt_column}`}
                className="grid size-5 shrink-0 place-items-center rounded-full text-green/60 hover:text-green cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <XIcon size={12} />
              </button>
            )}
          </span>
        ) : (
          <span className="inline-flex h-7 items-center rounded-md border border-dashed border-amber/30 px-2 text-[10px] text-amber">Map source</span>
        )}

        {locked ? (
          <>
            {col.rule_type === 'VALUE_MAP' && col.rule_value
              ? <ValueMapBadge ruleValue={col.rule_value} />
              : <span className={ruleTagCls(col.rule_type)}>{col.rule_type}</span>}
            {col.rule_value && (
              <span title={col.rule_value}
                className="inline-flex h-6 max-w-[120px] items-center truncate rounded-md border border-border bg-surface px-2 font-mono text-[9px] text-muted">
                {ruleValueLabel(col.rule_type, col.rule_value)}
              </span>
            )}
          </>
        ) : (
          <>
            <span className={`relative inline-flex h-6 shrink-0 items-center ${RULE_SELECT_WIDTH[col.rule_type] ?? 'w-[88px]'}`}>
              <select value={col.rule_type} aria-label={`Rule type for ${col.mnt_column}`}
                onChange={(event) => onChangeField({ rule_type: event.target.value })}
                className="h-6 w-full appearance-none rounded-md border border-border bg-surface2 pl-2 pr-5 text-[10px] font-normal leading-none text-muted outline-none cursor-pointer hover:border-border2 focus:border-accent">
                {ruleTypes.map((ruleType) => <option key={ruleType} value={ruleType}>{ruleType}</option>)}
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-1.5 grid place-items-center text-faint">
                <ChevronDownIcon size={10} />
              </span>
            </span>
            {(col.rule_type === 'DEFAULT' || col.rule_type === 'VALUE_MAP') && (
              <input value={col.rule_value ?? ''} aria-label={`Rule value for ${col.mnt_column}`}
                onChange={(event) => onChangeField({ rule_value: event.target.value })}
                placeholder={col.rule_type === 'VALUE_MAP' ? '{"STORE":"S"}' : 'VND'}
                className="h-7 min-w-[90px] flex-1 rounded-md border border-border bg-surface px-2 font-mono text-[10px] text-fg outline-none focus:border-accent" />
            )}
            <label title={col.json_field ? `Require ${col.mnt_column}` : 'Map a source before making it required'}
              className={'flex h-7 items-center gap-1 text-[10px] select-none ' + (col.json_field ? 'text-muted cursor-pointer' : 'text-faint cursor-not-allowed')}>
              <input type="checkbox" checked={col.required} disabled={!col.json_field}
                aria-label={`Required for ${col.mnt_column}`}
                onChange={(event) => onChangeField({ required: event.target.checked })} /> required
            </label>
          </>
        )}
      </div>

      <div className="flex flex-none items-center gap-1">
        {selectedSource && !locked && (
          <button type="button" onClick={(event) => { event.stopPropagation(); onClick() }}
            aria-label={`Map source field ${selectedSource} to target column ${col.mnt_column}`}
            className="h-9 px-2 grid place-items-center rounded text-[11px] font-semibold text-accent bg-accent-weak hover:brightness-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Map
          </button>
        )}
        <button type="button" onClick={(event) => { event.stopPropagation(); onMove(-1) }} disabled={!canMoveUp} title="Move up"
          aria-label={`Move ${col.mnt_column} up`}
          className={'size-9 grid place-items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-accent ' + (canMoveUp ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}>
          <ChevronUpIcon size={14} />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onMove(1) }} disabled={!canMoveDown} title="Move down"
          aria-label={`Move ${col.mnt_column} down`}
          className={'size-9 grid place-items-center rounded outline-none focus-visible:ring-2 focus-visible:ring-accent ' + (canMoveDown ? 'text-muted hover:text-fg cursor-pointer' : 'text-faint/40 cursor-not-allowed')}>
          <ChevronDownIcon size={14} />
        </button>
        {locked ? (
          <span title="Standard column (Oracle contract) - locked: source & column fixed" role="img"
            aria-label={`${col.mnt_column} is a locked standard column`}
            className="size-9 grid place-items-center text-faint cursor-not-allowed">
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.1">
              <rect x="2.5" y="5.3" width="7" height="4.7" rx="1" />
              <path d="M4 5.3V4a2 2 0 0 1 4 0v1.3" strokeLinecap="round" />
            </svg>
          </span>
        ) : (
          <button type="button" onClick={(event) => { event.stopPropagation(); onRemove() }} title="Remove column"
            aria-label={`Remove target column ${col.mnt_column}`}
            className="size-9 grid place-items-center rounded text-muted hover:text-accent hover:bg-accent-weak cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <XIcon size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function ValueMapBadge({ ruleValue }: { ruleValue: string }) {
  const entries = valueMapEntries(ruleValue)
  const accessibleRules = entries.length > 0
    ? entries.map(([source, target]) => `${source} maps to ${target}`).join(', ')
    : ruleValue

  return (
    <span className="group relative inline-flex">
      <span aria-label={`VALUE_MAP rules: ${accessibleRules}`} className={ruleTagCls('VALUE_MAP')}>
        VALUE_MAP
      </span>
      <span role="tooltip" aria-hidden="true"
        className="pointer-events-none invisible absolute bottom-[calc(100%+8px)] left-0 z-50 min-w-[170px] rounded-lg border border-border bg-surface p-2.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
        <span className="mb-1.5 block text-[10px] font-semibold text-fg">Value map rules</span>
        {entries.length > 0 ? entries.map(([source, target]) => (
          <span key={source} className="flex items-center justify-between gap-4 py-0.5 font-mono text-[10px]">
            <span className="text-muted">{source}</span>
            <span aria-hidden="true" className="text-faint">→</span>
            <span className="text-green">{target}</span>
          </span>
        )) : (
          <span className="block max-w-[240px] break-all font-mono text-[9px] text-muted">{ruleValue}</span>
        )}
      </span>
    </span>
  )
}
