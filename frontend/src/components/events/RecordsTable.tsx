// Bảng record của một batch + dòng tổng kết số record bị loại khỏi file.
// Batch thật có thể tới hàng nghìn record nên bảng có: tab lọc theo validation_status
// (kèm số đếm), tìm theo change_id/item_id, và trần số hàng vẽ ra (ROW_LIMIT) để
// không dựng 10.000 thẻ DOM cùng lúc làm treo trang.

import { useState } from 'react'
import type { EventRecord } from '../../types'
import { RecordPill } from '../../lib/status'
import { AlertIcon, SearchIcon } from '../icons'
import { Panel } from '../Panel'
import { FilterTabs } from '../FilterTabs'

// Số hàng vẽ ra tối đa sau khi lọc. Lọc/tìm cho hẹp lại là cách xem phần còn lại.
const ROW_LIMIT = 500

export function RecordsTable({ records }: { records: EventRecord[] }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const setAside = records.filter((r) => r.validation_status === 'SET_ASIDE')

  // Đếm theo trạng thái để in số ngay trên tab; 'all' = tổng số record
  const counts = new Map<string, number>()
  counts.set('all', records.length)
  for (const r of records) {
    counts.set(r.validation_status, (counts.get(r.validation_status) ?? 0) + 1)
  }
  // Chỉ hiện tab của những trạng thái ĐANG CÓ trong batch này
  const tabs = ['all', ...new Set(records.map((r) => r.validation_status))]

  const query = search.trim().toLowerCase()
  const filtered = records
    .filter((r) => statusFilter === 'all' || r.validation_status === statusFilter)
    .filter((r) => !query
      || r.change_id.toLowerCase().includes(query)
      || r.item_id.toLowerCase().includes(query))
  const shown = filtered.slice(0, ROW_LIMIT)

  return (
    <Panel title={`Records (${records.length})`}>
      <div className="flex items-center gap-3 flex-wrap px-[18px] py-2.5 border-b border-border">
        <FilterTabs tabs={tabs} active={statusFilter} onChange={setStatusFilter} counts={counts} label="Filter records by validation status" />
        <div className="relative flex-1 min-w-[180px] max-w-[280px] ml-auto">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-faint grid place-items-center">
            <SearchIcon />
          </span>
          <input
            aria-label="Search records by change ID or item ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search change id / item…"
            className="w-full py-1.5 pl-[34px] pr-[11px] border border-border rounded-lg bg-surface text-fg text-[12.5px] outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* min-w + overflow-x: màn hẹp thì cuộn ngang thay vì bóp méo cột */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
          <caption className="sr-only">Records in this price event</caption>
          <colgroup>
            <col className="w-[24%]" /><col className="w-[18%]" /><col className="w-[18%]" />
            <col className="w-[120px]" /><col />
          </colgroup>
          <thead className="bg-surface2 text-[10.5px] uppercase tracking-[0.05em] text-faint font-semibold">
            <tr>
              {['Change ID', 'Item', 'Store/Zone', 'Status', 'Reason'].map((heading) => (
                <th key={heading} scope="col" className="px-[18px] py-2 border-b border-border">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[12px] font-mono">
            {shown.map((record, index) => (
              <tr key={`${record.change_id}-${record.version}-${index}`} className="border-b border-border">
                <td className="px-[18px] py-2.5 truncate">{record.change_id}</td>
                <td className="px-[18px] py-2.5 truncate">{record.item_id}</td>
                <td className="px-[18px] py-2.5 truncate">{record.store_id_or_zone}</td>
                <td className="px-[18px] py-2.5"><RecordPill status={record.validation_status} /></td>
                <td className="px-[18px] py-2.5 truncate text-amber">{record.set_aside_reason || ''}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-7 py-7 text-center text-muted text-[13px]">No records match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Nói thẳng khi bảng bị cắt bớt — im lặng cắt sẽ khiến người xem tưởng đã thấy hết */}
      {filtered.length > shown.length && (
        <div className="px-[18px] py-2.5 text-[12px] text-muted border-t border-border">
          Showing first {shown.length} of {filtered.length} matching records - narrow the filter or search to see the rest.
        </div>
      )}

      {setAside.length > 0 && (
        <div className="px-[18px] py-2.5 text-[12px] text-amber flex items-center gap-2 bg-amber-bg border-t border-border">
          <AlertIcon /> {setAside.length} set aside - excluded from file.
        </div>
      )}
    </Panel>
  )
}
