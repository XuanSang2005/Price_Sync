// Một ô cấu hình gắn với MỘT config_key: đọc từ GET /config, ghi bằng PUT /config/{key}.
// Nguyên tắc "nối dây thật thà": key chưa có trong DB → ô bị khoá + gắn nhãn "no DB",
// seed key vào bảng config là ô tự mở, không phải sửa UI.

import { useState, useEffect } from 'react'
import { saveConfig } from '../../lib/api'

// Key bắt đầu bằng '_' là thông tin chỉ để XEM (vd endpoint cố định trong code), không sửa được
function isReadOnlyKey(configKey: string) {
  return configKey.startsWith('_')
}

// Kiểm tra riêng cho filename_pattern: phải là file .mnt và phải có <ts> để mỗi lần ghi lại
// sinh ra tên khác nhau (không đè mất file cũ).
// LƯU Ý: đây mới là chặn ở UI — gọi thẳng API vẫn lọt, backend cần chặn lại (đang nợ).
function validate(configKey: string, value: string): string | null {
  if (configKey === 'filename_pattern' && (!value.endsWith('.mnt') || !value.includes('<ts>'))) {
    return 'Filename must end .mnt and contain <ts>'
  }
  return null
}

export function ConfigField({ label, configKey, value, present, mono, onSaved, showToast }: {
  label: string
  configKey: string
  value: string
  present: boolean // key có tồn tại trong DB không
  mono?: boolean // hiện bằng font đều (đường dẫn, IP...)
  onSaved: () => void // nạp lại config sau khi lưu
  showToast: (message: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // Giá trị từ server về sau (poll/nạp lại) → cập nhật vào ô nháp
  useEffect(() => setDraft(value), [value])

  function save() {
    const error = validate(configKey, draft)
    if (error) { showToast(error); return }
    saveConfig(configKey, draft)
      .then(() => {
        setEditing(false)
        showToast('Saved ' + configKey)
        onSaved()
      })
      .catch(() => showToast('Save failed'))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-muted font-medium">{label}</label>
        {!present ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-faint border border-border px-1.5 py-px rounded">no DB</span>
        ) : editing ? (
          <span className="flex gap-2">
            <button onClick={() => { setEditing(false); setDraft(value) }} className="text-[11px] text-muted cursor-pointer bg-transparent border-none">Cancel</button>
            <button onClick={save} className="text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-none">Save</button>
          </span>
        ) : isReadOnlyKey(configKey) ? null : (
          <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-none">Edit</button>
        )}
      </div>

      {editing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={'w-full py-[7px] px-2.5 border border-border rounded-lg bg-surface text-fg text-[12px] outline-none focus:border-accent ' + (mono ? 'font-mono' : '')}
        />
      ) : (
        <div className={'text-[12px] px-2.5 py-[7px] rounded-lg bg-surface2 border border-border break-all ' + (mono ? 'font-mono text-[12px]' : '') + (present ? '' : ' text-faint')}>
          {present ? (value || '-') : 'mock - seed key in DB to enable'}
        </div>
      )}
    </div>
  )
}
