// Trang Connections: sơ đồ luồng dữ liệu + các cấu hình kết nối (đọc/ghi bảng config trong DB).

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { ConfigItem, Health } from '../../types'
import { fetchConfig, fetchHealth } from '../../lib/api'
import { usePolling } from '../../lib/usePolling'
import { Toast, useToast } from '../../components/Toast'
import { AlertIcon, ServerIcon, FolderIcon, SyncIcon } from '../../components/icons'
import { DataFlow } from '../../components/connections/DataFlow'
import { ConnectorCard } from '../../components/connections/ConnectorCard'
import { ConfigField } from '../../components/connections/ConfigField'
import { HealthStrip } from '../../components/connections/HealthStrip'

export const Route = createFileRoute('/connections/')({ component: ConnectionsPage })

function ConnectionsPage() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const configRequestRef = useRef(0)
  const { message: toast, showToast } = useToast()

  const loadConfig = useCallback(async () => {
    const requestId = ++configRequestRef.current
    setConfigLoading(true)
    setConfigError(null)
    try {
      const nextConfig = await fetchConfig()
      if (requestId !== configRequestRef.current) return
      setConfig(nextConfig)
    } catch (error) {
      if (requestId !== configRequestRef.current) return
      setConfigError(error instanceof Error ? error.message : 'Unable to load configuration')
    } finally {
      if (requestId === configRequestRef.current) setConfigLoading(false)
    }
  }, [])

  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      setHealth(await fetchHealth(signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setHealthError(error instanceof Error ? error.message : 'Unable to check system health')
    } finally {
      if (!signal?.aborted) setHealthLoading(false)
    }
  }, [])

  const handleConfigSaved = useCallback((configKey: string, configValue: string) => {
    // The PUT already succeeded, so keep the visible value current while GET
    // refreshes the canonical (possibly normalized) value in the background.
    setConfig((current) => current.map((item) => item.config_key === configKey
      ? { ...item, config_value: configValue }
      : item))
    void loadConfig()
  }, [loadConfig])

  useEffect(() => {
    void loadConfig()
    return () => { configRequestRef.current += 1 }
  }, [loadConfig])
  const refreshHealth = usePolling(loadHealth, 10000)

  // Đổi danh sách config thành Map để tra theo key cho nhanh
  const values = new Map(config.map((c) => [c.config_key, c.config_value]))
  const get = (key: string) => values.get(key) ?? ''
  const has = (key: string) => values.has(key) // không có trong DB → ô hiện dạng khoá
  const connectionState = health && !healthLoading && !healthError ? !!health.api && !!health.db : null

  return (
    <div className="px-4 sm:px-7 pt-[26px] pb-11 w-full flex flex-col gap-[22px]">
      <div>
        <h1 className="m-0 text-[21px] font-semibold tracking-tight">Connections</h1>
        <p className="mt-[5px] text-[13px] text-muted">Flow, settings, and system health.</p>
      </div>

      <DataFlow
        xcenterPath={get('xcenter_inbound_path')}
        connected={connectionState}
        checking={healthLoading}
        unavailable={!!healthError}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="m-0 font-semibold text-sm">Connector settings</h2>
        {configLoading && <span role="status" className="text-[11px] text-muted">Loading configuration…</span>}
      </div>

      {configError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-accent bg-accent-weak px-3 py-2 text-[12px] text-accent">
          <span>Configuration could not be refreshed: {configError}</span>
          <button type="button" onClick={() => void loadConfig()} className="min-h-8 px-2 font-semibold bg-transparent border-none text-accent cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {config.length > 0 || (!configLoading && !configError) ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <ConnectorCard icon={<ServerIcon />} title="HQ intake"
            note="Allowlisted IPs only. Replay window uses minutes.">
            <ConfigField label="Endpoint" configKey="_endpoint" value="POST /api/v1/price-events" present mono onSaved={handleConfigSaved} showToast={showToast} />
            <ConfigField label="IP allowlist" configKey="ip_allowlist" value={get('ip_allowlist')} present={has('ip_allowlist')} mono onSaved={handleConfigSaved} showToast={showToast} />
            <ConfigField label="Replay window (min)" configKey="replay_skew_min" value={get('replay_skew_min')} present={has('replay_skew_min')} onSaved={handleConfigSaved} showToast={showToast} />
          </ConnectorCard>

          <ConnectorCard icon={<FolderIcon />} title="Xcenter output"
            note={<>MNT files are written here. <span className="font-mono">&lt;ts&gt;</span> keeps names unique.</>}>
            <ConfigField label="Target folder" configKey="xcenter_inbound_path" value={get('xcenter_inbound_path')} present={has('xcenter_inbound_path')} mono onSaved={handleConfigSaved} showToast={showToast} />
            <ConfigField label="Filename pattern" configKey="filename_pattern" value={get('filename_pattern')} present={has('filename_pattern')} mono editHint="Use <ts> to avoid duplicate names" onSaved={handleConfigSaved} showToast={showToast} />
          </ConnectorCard>

          <ConnectorCard icon={<SyncIcon size={16} />} title="Processing"
            note={<>Above this ratio, the batch fails. <span className="font-mono">0.2 = 20%</span>.</>}>
            <ConfigField label="Abort threshold (0–1)" configKey="abort_threshold" value={get('abort_threshold')} present={has('abort_threshold')} editHint="0.2 = 20%; higher set-aside ratios fail the batch" onSaved={handleConfigSaved} showToast={showToast} />
          </ConnectorCard>

          <ConnectorCard icon={<AlertIcon size={16} />} title="Email alerts"
            note="Used for the next failed batch. SMTP stays server-managed.">
            <ConfigField label="Sender email" configKey="alert_email_from" value={get('alert_email_from')} present={has('alert_email_from')} onSaved={handleConfigSaved} showToast={showToast} />
            <ConfigField label="Recipient email" configKey="alert_email_to" value={get('alert_email_to')} present={has('alert_email_to')} onSaved={handleConfigSaved} showToast={showToast} />
          </ConnectorCard>
        </div>
      ) : !configError ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted" role="status">
          Loading connector configuration…
        </div>
      ) : null}

      <HealthStrip health={health} loading={healthLoading} error={healthError} onRetry={refreshHealth} />

      <Toast message={toast} />
    </div>
  )
}
