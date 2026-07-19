import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { ConfigItem } from '../../types'
import { MappingsTab } from '../../components/MappingsTab'

// "/config" — trang cấu hình theo bố cục TDD (Connections / Mappings / Processing).
// Nguyên tắc TRUNG THỰC: field nào có config_key trong DB → sửa + lưu được thật;
// field nào chưa seed vào DB → khóa (disabled) + tag "chưa nối DB", placeholder là giá trị minh họa.
// Sau này seed thêm key vào bảng config là field tự mở khóa, không cần sửa UI.
export const Route = createFileRoute('/config/')({
  component: ConfigPage,
})

// ===== Khai báo field: mỗi field trỏ vào một config_key trong DB =====
type FieldDef = {
  configKey: string
  label: string
  badge?: string // nhãn nhỏ cạnh label (vd "SECRET STORE")
  placeholder: string // giá trị minh họa khi key chưa có trong DB
  note?: string // chú thích dưới ô
}

// Tab Connections — thẻ HQ intake
// (secret không xuất hiện ở đây — kể cả tham chiếu: chìa thật nằm ở env var trên server,
//  đổi chìa = sửa env + restart, không đi qua console. ADR-11)
const HQ_FIELDS_SMALL: FieldDef[] = [
  { configKey: 'replay_skew_min', label: 'Replay skew ± min', placeholder: '5' },
]

// Tab Connections — thẻ Xcenter output
const XCENTER_FIELDS: FieldDef[] = [
  { configKey: 'xcenter_inbound_path', label: 'Inbound path', placeholder: '/mnt/xcenter/inbound' },
  {
    configKey: 'filename_pattern',
    label: 'Filename pattern',
    placeholder: 'pricesync_<batch_id>_v<version>_<ts>.mnt',
  },
]

// Tab Processing — config ĐANG SỐNG thật trong DB
const PROCESSING_FIELDS: FieldDef[] = [
  {
    configKey: 'abort_threshold',
    label: 'Abort threshold',
    placeholder: '0.2',
    note: 'Vượt tỉ lệ set-aside này → batch FAILED (0.2 = 20%).',
  },
]

// ===== Một ô nhập cấu hình (khai báo NGOÀI component trang để không bị mất focus khi gõ) =====
function ConfigField({
  field,
  value,
  exists,
  onChange,
}: {
  field: FieldDef
  value: string
  exists: boolean // key có trong DB không → quyết định sửa được hay khóa
  onChange: (newValue: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm text-zinc-400">{field.label}</label>
        {field.badge !== undefined && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {field.badge}
          </span>
        )}
        {!exists && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded">
            chưa nối DB
          </span>
        )}
      </div>
      <input
        value={value}
        disabled={!exists}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-600 focus:outline-none focus:border-zinc-400 focus:bg-zinc-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {field.note !== undefined && <p className="text-xs text-zinc-600 mt-1.5">{field.note}</p>}
    </div>
  )
}

// Chip 1 địa chỉ IP trong allowlist (có nút × để gỡ)
function IpChip({ ip, onRemove, canEdit }: { ip: string; onRemove: () => void; canEdit: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm text-zinc-100 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5">
      {ip}
      {canEdit && (
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400">
          ×
        </button>
      )}
    </span>
  )
}

function ConfigPage() {
  const [values, setValues] = useState<Record<string, string>>({}) // giá trị THẬT trong DB
  const [drafts, setDrafts] = useState<Record<string, string>>({}) // giá trị đang sửa
  const [activeTab, setActiveTab] = useState<'connections' | 'mappings' | 'processing'>('connections')
  const [ipInput, setIpInput] = useState('') // ô "add address…"
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('') // thông báo sau khi lưu

  // Tải toàn bộ config từ DB → đổ vào values + drafts
  function loadConfigs() {
    fetch('/api/v1/config')
      .then((response) => response.json())
      .then((data: ConfigItem[]) => {
        const map: Record<string, string> = {}
        for (const item of data) {
          map[item.config_key] = item.config_value
        }
        setValues(map)
        setDrafts(map)
      })
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  // key có trong DB không?
  function exists(key: string) {
    return key in values
  }

  // giá trị hiển thị của một key (draft nếu đang sửa, rỗng nếu chưa có)
  function draftOf(key: string) {
    return drafts[key] ?? ''
  }

  function handleChange(key: string, newValue: string) {
    setDrafts({ ...drafts, [key]: newValue })
  }

  // ===== IP allowlist: lưu trong DB dạng chuỗi "ip1,ip2" → UI tách thành chips =====
  const ipListKey = 'ip_allowlist'
  const ipList = draftOf(ipListKey)
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip !== '')

  function addIp() {
    if (ipInput.trim() === '') {
      return
    }
    const newList = [...ipList, ipInput.trim()]
    handleChange(ipListKey, newList.join(','))
    setIpInput('')
  }

  function removeIp(index: number) {
    const newList = ipList.filter((_, i) => i !== index)
    handleChange(ipListKey, newList.join(','))
  }

  // ===== Lưu: PUT từng key ĐÃ CÓ trong DB mà giá trị bị sửa =====
  const dirtyKeys = Object.keys(drafts).filter(
    (key) => exists(key) && drafts[key] !== values[key]
  )

  function handleSave() {
    setSaving(true)
    setMessage('')

    // gửi tất cả key bị sửa song song, đợi xong hết
    const requests = dirtyKeys.map((key) =>
      fetch('/api/v1/config/' + key, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_value: drafts[key] }),
      })
    )
    Promise.all(requests)
      .then((responses) => {
        const allOk = responses.every((response) => response.ok)
        setSaving(false)
        setMessage(allOk ? 'Đã lưu ✓' : 'Có key lưu thất bại — kiểm tra backend')
        loadConfigs()
      })
      .catch(() => {
        setSaving(false)
        setMessage('Lưu thất bại — không kết nối được backend')
      })
  }

  // Tab: mono chữ hoa giãn cách, active gạch chân (đồng bộ với tab ở trang Events)
  function Tab({ id, label }: { id: typeof activeTab; label: string }) {
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={
          'font-mono text-xs uppercase tracking-[0.25em] pb-2 border-b ' +
          (activeTab === id
            ? 'text-zinc-100 border-zinc-100'
            : 'text-zinc-500 border-transparent hover:text-zinc-300')
        }
      >
        {label}
      </button>
    )
  }

  return (
    // cột giữa trang (mx-auto) — trang rộng mà neo trái sẽ lệch một bên
    <div className="max-w-3xl mx-auto">
      {/* ===== Tabs (không cần tiêu đề — nav đã ghi Config) ===== */}
      <div className="flex items-center gap-8 border-b border-zinc-800/60 mb-10">
        <Tab id="connections" label="Connections" />
        <Tab id="mappings" label="Mappings" />
        <Tab id="processing" label="Processing" />
      </div>

      {/* ===== Tab Connections: MỘT cột dọc, section ngăn bằng hairline ===== */}
      {activeTab === 'connections' && (
        <div>
          {/* --- HQ intake --- */}
          <section className="pb-10">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">HQ intake</h2>
            <p className="text-sm text-zinc-600 mt-1.5 mb-7 font-mono">POST /api/v1/price-events</p>

            {/* IP allowlist dạng chips */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-sm text-zinc-400">IP allowlist</label>
                {!exists(ipListKey) && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                    chưa nối DB
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ipList.map((ip, index) => (
                  <IpChip key={index} ip={ip} onRemove={() => removeIp(index)} canEdit={exists(ipListKey)} />
                ))}
                <input
                  value={ipInput}
                  disabled={!exists(ipListKey)}
                  placeholder="add address…"
                  onChange={(e) => setIpInput(e.target.value)}
                  className="font-mono text-sm bg-zinc-900/60 border border-dashed border-zinc-600 rounded-lg px-3 py-1.5 text-zinc-100 placeholder:text-zinc-500 w-40 focus:outline-none focus:border-zinc-400 disabled:opacity-50"
                />
                <button
                  onClick={addIp}
                  disabled={!exists(ipListKey)}
                  className="text-sm font-medium text-zinc-200 border border-zinc-700 rounded-lg px-3.5 py-1.5 hover:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Replay skew — ô hẹp */}
            <div className="max-w-[220px] mt-5">
              {HQ_FIELDS_SMALL.map((field) => (
                <ConfigField
                  key={field.configKey}
                  field={field}
                  value={draftOf(field.configKey)}
                  exists={exists(field.configKey)}
                  onChange={(newValue) => handleChange(field.configKey, newValue)}
                />
              ))}
            </div>

          </section>

          {/* --- Xcenter output --- */}
          <section className="border-t border-zinc-800/60 pt-10 pb-2">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">Xcenter output</h2>
            <p className="text-sm text-zinc-600 mt-1.5 mb-7 font-mono">MNT → Xcenter inbound</p>

            <div className="space-y-5">
              {XCENTER_FIELDS.map((field) => (
                <ConfigField
                  key={field.configKey}
                  field={field}
                  value={draftOf(field.configKey)}
                  exists={exists(field.configKey)}
                  onChange={(newValue) => handleChange(field.configKey, newValue)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ===== Tab Mappings: sổ đăng ký field (preview — mảnh 4 nối API) ===== */}
      {activeTab === 'mappings' && <MappingsTab />}

      {/* ===== Tab Processing: config đang sống thật ===== */}
      {activeTab === 'processing' && (
        <section className="pb-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-7">
            Processing rules
          </h2>
          <div className="space-y-5">
            {PROCESSING_FIELDS.map((field) => (
              <ConfigField
                key={field.configKey}
                field={field}
                value={draftOf(field.configKey)}
                exists={exists(field.configKey)}
                onChange={(newValue) => handleChange(field.configKey, newValue)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== Thanh lưu dưới cùng (flat, hairline) ===== */}
      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-5 mt-4">
        <span className="font-mono text-xs text-zinc-600">
          {Object.keys(values).length} config trong DB
        </span>
        <div className="flex items-center gap-4">
          {message !== '' && (
            <span
              className={
                'text-sm font-medium ' +
                (message === 'Đã lưu ✓' ? 'text-emerald-400' : 'text-red-400')
              }
            >
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={dirtyKeys.length === 0 || saving}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
