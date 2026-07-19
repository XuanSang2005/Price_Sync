import { useState } from 'react'

// Tab "Mappings" — cuốn SỔ ĐĂNG KÝ field: mỗi dòng UI = một dòng bảng mapping_rule trong DB.
// Ý nghĩa nghiệp vụ: field phải được KHAI ở đây TRƯỚC thì HQ gửi qua API hệ thống mới hiểu +
// in ra file MNT. Field lạ không khai → bỏ qua. Đây là whitelist, không phải "gửi gì nhận nấy".
//
// TRẠNG THÁI HIỆN TẠI: xem trước bố cục — thêm/xoá chỉ chạy trong trình duyệt, CHƯA lưu vào DB.
// Mảnh 4 sẽ nối API CRUD (GET/POST/DELETE /api/v1/mappings) thay cho state cục bộ bên dưới.

export type MappingRule = {
  id: number
  record_type: string // dòng nào của file: FDETL (new/update) | FDELE (delete)
  position: number // cột thứ mấy trong dòng (file MNT là positional)
  json_field: string // lấy dữ liệu từ field nào của record
  mnt_column: string // nhãn cột (cho người đọc)
  rule_type: string // DIRECT | DEFAULT | VALUE_MAP
  rule_value: string | null // nghĩa TÙY rule_type
}

// Màu cho từng loại quy tắc — tông trầm (màu/10 + chữ-400), không chói, đồng bộ StatusBadge
const RULE_TYPE_STYLES: Record<string, string> = {
  DIRECT: 'bg-zinc-500/10 text-zinc-400', // lấy thẳng field
  DEFAULT: 'bg-amber-500/10 text-amber-400', // điền hằng số khi thiếu
  VALUE_MAP: 'bg-violet-500/10 text-violet-400', // tra bảng đổi giá trị
}

function RuleTypeTag({ type }: { type: string }) {
  const style = RULE_TYPE_STYLES[type] ?? 'bg-zinc-500/10 text-zinc-400'
  return (
    <span className={'font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded ' + style}>
      {type}
    </span>
  )
}

// Dữ liệu MẪU khớp đúng seed V14 (3 dòng FDETL + 1 dòng FDELE item)
const INITIAL_RULES: MappingRule[] = [
  { id: 1, record_type: 'FDETL', position: 1, json_field: 'item_id', mnt_column: 'ITEM', rule_type: 'DIRECT', rule_value: null },
  { id: 2, record_type: 'FDETL', position: 2, json_field: 'store_id_or_zone', mnt_column: 'LOC_TYPE', rule_type: 'VALUE_MAP', rule_value: '{"STORE":"S","ZONE":"Z"}' },
  { id: 3, record_type: 'FDETL', position: 5, json_field: 'currency', mnt_column: 'CURRENCY', rule_type: 'DEFAULT', rule_value: 'VND' },
  { id: 4, record_type: 'FDELE', position: 1, json_field: 'item_id', mnt_column: 'ITEM', rule_type: 'DIRECT', rule_value: null },
]

// Một record MẪU để minh hoạ ô "xem trước" (currency rỗng → thấy rõ DEFAULT điền VND)
const SAMPLE_RECORD: Record<string, string> = {
  item_id: 'SKU900',
  store_id_or_zone: 'STORE_001',
  currency: '',
}

// Áp một luật lên record mẫu → ra giá trị ô đó (mini-Mapper, chỉ để xem trước)
function applyRule(rule: MappingRule, sample: Record<string, string>): string {
  const raw = sample[rule.json_field] ?? ''
  if (rule.rule_type === 'DEFAULT') {
    return raw !== '' ? raw : rule.rule_value ?? ''
  }
  if (rule.rule_type === 'VALUE_MAP') {
    try {
      const map = JSON.parse(rule.rule_value ?? '{}') as Record<string, string>
      const prefix = raw.split('_')[0] // STORE_001 → STORE
      return map[prefix] ?? '?'
    } catch {
      return '?'
    }
  }
  // DIRECT (mặc định): lấy thẳng
  return raw
}

// Ô XEM TRƯỚC: dựng một dòng của file MNT từ các luật của record_type đó, theo THỨ TỰ position.
// Vị trí nào chưa có luật → ô mờ "·" (nhắc rằng seed chưa đủ — mảnh 3 sẽ điền nốt).
function LinePreview({ rules, recordType }: { rules: MappingRule[]; recordType: string }) {
  const ofType = rules
    .filter((r) => r.record_type === recordType)
    .sort((a, b) => a.position - b.position)
  if (ofType.length === 0) {
    return null
  }
  const maxPos = Math.max(...ofType.map((r) => r.position))

  const cells: { pos: number; value: string; type: string | null }[] = []
  for (let p = 1; p <= maxPos; p++) {
    const rule = ofType.find((r) => r.position === p)
    if (rule) {
      cells.push({ pos: p, value: applyRule(rule, SAMPLE_RECORD) || '∅', type: rule.rule_type })
    } else {
      cells.push({ pos: p, value: '·', type: null }) // chỗ trống chưa khai
    }
  }

  // Chuỗi ghép giống hệt một dòng trong file (đầu dòng là record_type)
  const joined = recordType + ',' + cells.map((c) => (c.type ? c.value : '')).join(',')

  return (
    <div className="mb-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 mb-2">
        Xem trước · record mẫu item=SKU900 · loc=STORE_001 · currency=∅
      </p>
      {/* các ô cột theo thứ tự */}
      <div className="flex flex-wrap items-end gap-1.5 mb-2">
        {cells.map((c) => (
          <div key={c.pos} className="flex flex-col items-center">
            <span className="font-mono text-[10px] text-zinc-600 mb-1">{c.pos}</span>
            <span
              className={
                'font-mono text-sm rounded px-2 py-1 border ' +
                (c.type
                  ? 'text-zinc-100 bg-zinc-900 border-zinc-700'
                  : 'text-zinc-600 bg-transparent border-dashed border-zinc-800')
              }
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>
      {/* dòng ghép cuối cùng (đúng thứ file sẽ ghi) */}
      <code className="block font-mono text-sm text-emerald-400/90 bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 overflow-x-auto">
        {joined}
      </code>
    </div>
  )
}

export function MappingsTab() {
  const [rules, setRules] = useState<MappingRule[]>(INITIAL_RULES)

  // Form thêm luật (state cục bộ — chưa gọi API)
  const [recordType, setRecordType] = useState('FDETL')
  const [position, setPosition] = useState('')
  const [jsonField, setJsonField] = useState('')
  const [mntColumn, setMntColumn] = useState('')
  const [ruleType, setRuleType] = useState('DIRECT')
  const [ruleValue, setRuleValue] = useState('')

  const recordTypes = ['FDETL', 'FDELE']

  function addRule() {
    // kiểm tối thiểu: phải có field + vị trí là số
    const pos = Number(position)
    if (jsonField.trim() === '' || Number.isNaN(pos) || pos < 1) {
      return
    }
    const newRule: MappingRule = {
      id: Math.max(0, ...rules.map((r) => r.id)) + 1, // id giả (mảnh 4 để DB cấp)
      record_type: recordType,
      position: pos,
      json_field: jsonField.trim(),
      mnt_column: mntColumn.trim() || jsonField.trim().toUpperCase(),
      rule_type: ruleType,
      rule_value: ruleType === 'DIRECT' ? null : ruleValue.trim() || null,
    }
    setRules([...rules, newRule])
    // reset form
    setPosition('')
    setJsonField('')
    setMntColumn('')
    setRuleValue('')
  }

  function removeRule(id: number) {
    setRules(rules.filter((r) => r.id !== id))
  }

  const inputClass =
    'font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-600 focus:outline-none focus:border-zinc-400 focus:bg-zinc-800/80'

  return (
    <div>
      {/* Lời dẫn: giải thích whitelist + cảnh báo hợp đồng cột */}
      <div className="mb-8">
        <p className="text-sm text-zinc-400 leading-relaxed">
          Mỗi dòng là một cột của file MNT. Field phải được <span className="text-zinc-200">khai ở đây trước</span>{' '}
          thì HQ gửi qua API hệ thống mới hiểu và in ra — field lạ không khai sẽ bị bỏ qua.
        </p>
        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
          Cột MNT là hợp đồng vị trí với Xstore/DataLoader — thêm cột chỉ có tác dụng khi phía nhận đã chờ cột đó.
        </p>
        <span className="inline-block mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
          preview · thao tác chưa lưu (mảnh 4 nối API)
        </span>
      </div>

      {/* Mỗi loại dòng một section: ô xem trước + bảng luật */}
      {recordTypes.map((rt) => {
        const group = rules
          .filter((r) => r.record_type === rt)
          .sort((a, b) => a.position - b.position)
        if (group.length === 0) {
          return null
        }
        return (
          <section key={rt} className="mb-12">
            <div className="flex items-baseline gap-3 mb-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-300">{rt}</h3>
              <span className="text-xs text-zinc-600">{rt === 'FDETL' ? 'new / update' : 'delete'}</span>
            </div>

            <LinePreview rules={rules} recordType={rt} />

            {/* Bảng luật kiểu terminal — hairline, mono */}
            <div className="border-y border-zinc-800/60">
              <table className="w-full">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 text-left">
                    <th className="py-3 w-12 font-normal">#</th>
                    <th className="py-3 font-normal">json_field</th>
                    <th className="py-3 font-normal">mnt_column</th>
                    <th className="py-3 font-normal">rule</th>
                    <th className="py-3 font-normal">value</th>
                    <th className="py-3 w-10 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((rule) => (
                    <tr key={rule.id} className="border-t border-zinc-800/40 text-sm">
                      <td className="py-3.5 font-mono text-zinc-500 tabular-nums">{rule.position}</td>
                      <td className="py-3.5 font-mono text-zinc-200">{rule.json_field}</td>
                      <td className="py-3.5 font-mono text-zinc-400">{rule.mnt_column}</td>
                      <td className="py-3.5">
                        <RuleTypeTag type={rule.rule_type} />
                      </td>
                      <td className="py-3.5 font-mono text-zinc-500 max-w-[220px] truncate">
                        {rule.rule_value ?? '—'}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="text-zinc-600 hover:text-red-400 text-base leading-none"
                          title="Gỡ luật"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {/* Form thêm luật (khai field mới) */}
      <section className="border-t border-zinc-800/60 pt-8">
        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-5">Thêm luật</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">record_type</label>
            <select value={recordType} onChange={(e) => setRecordType(e.target.value)} className={inputClass}>
              <option value="FDETL">FDETL</option>
              <option value="FDELE">FDELE</option>
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs text-zinc-500 mb-1.5">position</label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="8" className={inputClass + ' w-full'} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">json_field</label>
            <input value={jsonField} onChange={(e) => setJsonField(e.target.value)} placeholder="promo_code" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">mnt_column</label>
            <input value={mntColumn} onChange={(e) => setMntColumn(e.target.value)} placeholder="PROMO" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">rule_type</label>
            <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className={inputClass}>
              <option value="DIRECT">DIRECT</option>
              <option value="DEFAULT">DEFAULT</option>
              <option value="VALUE_MAP">VALUE_MAP</option>
            </select>
          </div>
          {/* rule_value chỉ hiện khi cần (DIRECT lấy thẳng field → không cần) */}
          {ruleType !== 'DIRECT' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-zinc-500 mb-1.5">
                {ruleType === 'DEFAULT' ? 'rule_value (hằng số)' : 'rule_value (JSON map)'}
              </label>
              <input
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                placeholder={ruleType === 'DEFAULT' ? 'VND' : '{"STORE":"S","ZONE":"Z"}'}
                className={inputClass + ' w-full'}
              />
            </div>
          )}
          <button
            onClick={addRule}
            className="text-sm font-medium text-zinc-200 border border-zinc-700 rounded-lg px-4 py-2 hover:border-zinc-500"
          >
            Thêm
          </button>
        </div>
      </section>
    </div>
  )
}
