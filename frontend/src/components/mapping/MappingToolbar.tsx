// Thanh công cụ: chọn loại bản ghi (FDETL/FDELE...), lọc field nguồn, và thanh tiến độ
// "đã map bao nhiêu cột".

import { SearchIcon } from '../icons'

export function MappingToolbar({
  recordTypes, recordType, recordTypeDisabled = false,
  onChangeRecordType, search, onChangeSearch, mappedCount, totalCount,
}: {
  recordTypes: string[]
  recordType: string
  recordTypeDisabled?: boolean
  onChangeRecordType: (recordType: string) => void
  search: string
  onChangeSearch: (search: string) => void
  mappedCount: number
  totalCount: number
}) {
  const percent = totalCount ? Math.round(mappedCount / totalCount * 100) : 0

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-[3px] p-[3px] bg-surface2 border border-border rounded-lg" role="group" aria-label="Record type">
        {recordTypes.map((t) => (
          <button type="button" key={t} onClick={() => onChangeRecordType(t)}
            disabled={recordTypeDisabled} aria-pressed={recordType === t}
            className={'text-[12px] min-h-8 px-3 py-[5px] rounded-md border-none font-mono outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
              (recordTypeDisabled ? 'cursor-not-allowed opacity-60 ' : 'cursor-pointer ') +
              (recordType === t ? 'bg-surface text-fg font-semibold shadow-[var(--shadow)]' : 'bg-transparent text-muted')}>
            {t}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[180px] max-w-[280px]">
        <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center"><SearchIcon /></span>
        <input value={search} onChange={(e) => onChangeSearch(e.target.value)} placeholder="Filter source fields…"
          aria-label="Filter source fields"
          className="w-full min-h-9 py-2 pl-[34px] pr-[11px] border border-border rounded-lg bg-surface text-fg text-[13px] outline-none focus:border-accent" />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <span className="text-[12px] text-muted font-medium whitespace-nowrap">{mappedCount}/{totalCount} columns mapped</span>
        <div className="w-[110px] h-[6px] rounded-full bg-surface2 border border-border overflow-hidden"
          role="progressbar" aria-label="Mapped columns" aria-valuemin={0} aria-valuemax={totalCount} aria-valuenow={mappedCount}>
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: percent + '%' }} />
        </div>
      </div>
    </div>
  )
}
