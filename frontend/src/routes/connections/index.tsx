// Trang Connections: sơ đồ luồng dữ liệu + các cấu hình kết nối (đọc/ghi bảng config trong DB).

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import type { ConfigItem, Health } from '../../types'
import { fetchConfig, fetchHealth } from '../../lib/api'
import { Toast, useToast } from '../../components/Toast'
import { ServerIcon, FolderIcon, SyncIcon } from '../../components/icons'
import { DataFlow } from '../../components/connections/DataFlow'
import { ConnectorCard } from '../../components/connections/ConnectorCard'
import { ConfigField } from '../../components/connections/ConfigField'
import { HealthStrip } from '../../components/connections/HealthStrip'

export const Route = createFileRoute('/connections/')({ component: ConnectionsPage })

function ConnectionsPage() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const { message: toast, showToast } = useToast()

  const load = useCallback(() => {
    fetchConfig().then(setConfig).catch(() => {})
    fetchHealth().then(setHealth).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  // Đổi danh sách config thành Map để tra theo key cho nhanh
  const values = new Map(config.map((c) => [c.config_key, c.config_value]))
  const get = (key: string) => values.get(key) ?? ''
  const has = (key: string) => values.has(key) // không có trong DB → ô hiện dạng khoá

  return (
    <div className="px-7 pt-[26px] pb-11 w-full flex flex-col gap-[22px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Connections</h1>
        <p className="mt-[5px] text-[13px] text-muted">Data flow and connector config owned by this system.</p>
      </div>

      {/* connected = API và DB đều sống; chưa gọi xong (health null) thì coi như chưa nối */}
      <DataFlow xcenterPath={get('xcenter_inbound_path')} connected={!!health?.api && !!health?.db} />

      <div className="font-semibold text-sm">Connectors &amp; config</div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <ConnectorCard icon={<ServerIcon />} title="HQ intake" subtitle="Inbound · JSON price event">
          <ConfigField label="Endpoint" configKey="_endpoint" value="POST /api/v1/price-events" present mono onSaved={load} showToast={showToast} />
          <ConfigField label="IP allowlist (ip_allowlist)" configKey="ip_allowlist" value={get('ip_allowlist')} present={has('ip_allowlist')} mono onSaved={load} showToast={showToast} />
          <ConfigField label="Replay window - min (replay_skew_min)" configKey="replay_skew_min" value={get('replay_skew_min')} present={has('replay_skew_min')} onSaved={load} showToast={showToast} />
        </ConnectorCard>

        <ConnectorCard icon={<FolderIcon />} title="Xcenter output" subtitle="Outbound · MNT file"
          footnote={<>MNT written in place; <span className="font-mono">&lt;ts&gt;</span> keeps names unique on rewrite.</>}>
          <ConfigField label="Target folder (xcenter_inbound_path)" configKey="xcenter_inbound_path" value={get('xcenter_inbound_path')} present={has('xcenter_inbound_path')} mono onSaved={load} showToast={showToast} />
          <ConfigField label="Filename pattern (filename_pattern)" configKey="filename_pattern" value={get('filename_pattern')} present={has('filename_pattern')} mono onSaved={load} showToast={showToast} />
        </ConnectorCard>

        <ConnectorCard icon={<SyncIcon size={16} />} title="Processing" subtitle="Business rules"
          footnote="Set-aside ratio above this aborts the batch (FAILED). 0.2 = 20%.">
          <ConfigField label="Abort threshold - set-aside ratio (abort_threshold)" configKey="abort_threshold" value={get('abort_threshold')} present={has('abort_threshold')} onSaved={load} showToast={showToast} />
        </ConnectorCard>
      </div>

      <HealthStrip health={health} />

      <Toast message={toast} />
    </div>
  )
}
