// Trang Field mapping: ghép dữ liệu server, draft có revision và các panel trình bày.
// Bulk replace chỉ được bật sau khi rules + metadata đã tải và được kiểm tra đầy đủ.

import { createFileRoute, useBlocker } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MappingRule, MappingPreview, MappingMeta } from '../../types'
import { CheckIcon, SaveIcon } from '../../components/icons'
import { Toast, useToast } from '../../components/Toast'
import { fetchRules, fetchMeta, fetchPreview, saveMapping, type SaveColumn } from '../../lib/mappingApi'
import { validateMapping } from '../../lib/mappingRules'
import { useMappingDraft } from '../../components/mapping/useMappingDraft'
import { useConnectorLines, ConnectorLines } from '../../components/mapping/ConnectorLines'
import { MappingToolbar } from '../../components/mapping/MappingToolbar'
import { SourcePanel } from '../../components/mapping/SourcePanel'
import { TargetPanel } from '../../components/mapping/TargetPanel'
import { PreviewSection } from '../../components/mapping/PreviewSection'

export const Route = createFileRoute('/mapping/')({ component: MappingPage })

type LoadStatus = 'loading' | 'ready' | 'error'

function MappingPage() {
  const [rules, setRules] = useState<MappingRule[]>([])
  const [meta, setMeta] = useState<MappingMeta | null>(null)
  const [preview, setPreview] = useState<MappingPreview | null>(null)
  const [criticalStatus, setCriticalStatus] = useState<LoadStatus>('loading')
  const [criticalError, setCriticalError] = useState('')
  const [previewStatus, setPreviewStatus] = useState<LoadStatus>('loading')
  const [previewError, setPreviewError] = useState('')

  const [recordType, setRecordType] = useState('FDETL')
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null)
  const [dragSrc, setDragSrc] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [customSources, setCustomSources] = useState<string[]>([])
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refreshWarning, setRefreshWarning] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  const criticalRequestRef = useRef(0)
  const previewRequestRef = useRef(0)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const { message: toast, showToast } = useToast()

  const ruleTypes = meta?.rule_types ?? []
  const recordTypes = meta?.record_types ?? []
  const reservedColumns = useMemo(
    () => new Set((meta?.standard_columns ?? []).map((column) => column.toUpperCase())),
    [meta],
  )
  const draft = useMappingDraft({ rules, recordType, reservedColumns, showToast })
  const { cols, dirty } = draft

  useBlocker({
    disabled: !dirty,
    enableBeforeUnload: dirty,
    shouldBlockFn: () => !window.confirm('You have unsaved mapping changes. Leave this page and discard them?'),
  })

  const loadCritical = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++criticalRequestRef.current
    setCriticalStatus('loading')
    setCriticalError('')
    try {
      const [nextRules, nextMeta] = await Promise.all([fetchRules(signal), fetchMeta(signal)])
      assertCriticalData(nextRules, nextMeta)
      if (requestId !== criticalRequestRef.current) return
      setRules(nextRules)
      setMeta(nextMeta)
      setRecordType((current) => nextMeta.record_types.includes(current) ? current : nextMeta.record_types[0])
      setCriticalStatus('ready')
    } catch (error) {
      if (isAbortError(error) || requestId !== criticalRequestRef.current) return
      // Không giữ một nửa response: editor phải có rules VÀ meta cùng hợp lệ mới được mở.
      setRules([])
      setMeta(null)
      setCriticalError(errorMessage(error, 'Could not load mapping configuration'))
      setCriticalStatus('error')
    }
  }, [])

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++previewRequestRef.current
    setPreviewStatus('loading')
    setPreviewError('')
    try {
      const nextPreview = await fetchPreview(signal)
      if (!Array.isArray(nextPreview.rows)) throw new Error('Mapping preview response is invalid')
      if (requestId !== previewRequestRef.current) return
      setPreview(nextPreview)
      setPreviewStatus('ready')
    } catch (error) {
      if (isAbortError(error) || requestId !== previewRequestRef.current) return
      setPreviewError(errorMessage(error, 'Could not load mapping preview'))
      setPreviewStatus('error')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    void loadCritical(controller.signal)
    void loadPreview(controller.signal)
    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, [loadCritical, loadPreview])

  // Lỗi của lần Save trước không còn đại diện cho draft sau khi người dùng sửa tiếp.
  useEffect(() => { setSaveError('') }, [draft.revision])

  useEffect(() => {
    if (!selectedSrc) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedSrc(null)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setSelectedSrc(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [selectedSrc])

  const previewFields = (preview?.rows ?? []).flatMap((row) => Object.keys(row.before ?? {}))
  const lockedSourceFields = new Set(cols
    .filter((column) => column.locked && column.json_field)
    .map((column) => column.json_field))
  const mappedSourceFields = new Set(cols
    .map((column) => column.json_field)
    .filter(Boolean))
  const sources = [...new Set([
    ...(meta?.source_fields ?? []),
    ...previewFields,
    ...customSources,
    ...cols.map((column) => column.json_field).filter(Boolean),
  ])].filter((source) => !hiddenSources.has(source) || mappedSourceFields.has(source))
  const removableFields = new Set(sources.filter((source) => !lockedSourceFields.has(source)))
  const usedFields = new Set(cols.map((column) => column.json_field).filter(Boolean))
  const query = search.trim().toLowerCase()
  const shownSources = sources.filter((source) => !query || source.toLowerCase().includes(query))
  const previewRows = (preview?.rows ?? []).filter((row) => row.record_type === recordType)
  const lines = useConnectorLines(panelRef, cols, `${search}·${previewRows.length}`)

  function handleMapSource(colKey: string, sourceField: string) {
    draft.mapSource(colKey, sourceField)
    setSelectedSrc(null)
  }

  function switchRecordType(next: string) {
    if (next === recordType) return
    if (isSaving) {
      showToast('Wait for the current save to finish before switching record type', 'warning')
      return
    }
    if (dirty && !window.confirm(`Discard unsaved ${recordType} mapping changes?`)) return
    draft.resetToRules(next)
    setSelectedSrc(null)
    setDragSrc(null)
    setSaveError('')
    setRecordType(next)
  }

  function addSource(name: string) {
    const clean = name.trim().replace(/\s+/g, '_')
    if (!clean) {
      showToast('Enter a field name', 'error')
      return false
    }
    keepSourceVisible(clean)
    return true
  }

  function keepSourceVisible(source: string) {
    setHiddenSources((current) => {
      if (!current.has(source)) return current
      const next = new Set(current)
      next.delete(source)
      return next
    })
    setCustomSources((current) => [...new Set([...current, source])])
  }

  function addTargetColumn(jsonField: string, mntColumn: string, required: boolean) {
    const added = draft.addColumn(jsonField, mntColumn, required)
    if (!added) return false

    const source = jsonField.trim().replace(/\s+/g, '_')
    if (source) keepSourceVisible(source)
    return true
  }

  function removeSource(name: string) {
    if (lockedSourceFields.has(name)) {
      showToast('A standard source field cannot be removed', 'warning')
      return
    }
    const affectedColumns = cols.filter((column) => !column.locked && column.json_field === name)
    if (affectedColumns.length > 0) {
      const targetNames = affectedColumns.map((column) => column.mnt_column).join(', ')
      const confirmed = window.confirm(
        `Remove source ${name} and unmap ${targetNames}? The MNT target${affectedColumns.length > 1 ? 's' : ''} will be kept.`,
      )
      if (!confirmed) return
      affectedColumns.forEach((column) => { draft.clearCol(column.key) })
    }
    setHiddenSources((current) => new Set(current).add(name))
    setCustomSources((current) => current.filter((field) => field !== name))
    if (selectedSrc === name) setSelectedSrc(null)
  }

  function removeColumn(colKey: string) {
    const column = cols.find((candidate) => candidate.key === colKey)
    if (!column || column.locked) return
    const confirmed = window.confirm(
      `Remove ${column.mnt_column} from this draft? It will be deleted from the server only after you save.`,
    )
    if (!confirmed) return
    if (draft.removeCol(colKey)) showToast(`${column.mnt_column} removed from draft - Undo is available`, 'warning')
  }

  function undoRemoveColumn() {
    if (draft.undoRemove()) showToast('Column restored')
  }

  async function save() {
    // State cập nhật theo render chưa đủ chặn hai click trong cùng một tick; ref là khoá đồng bộ.
    if (savingRef.current || criticalStatus !== 'ready' || !dirty) return
    const validationError = validateMapping(cols, ruleTypes)
    if (validationError) {
      setSaveError(validationError)
      showToast(validationError, 'error')
      return
    }

    const savedRecordType = recordType
    const savedRevision = draft.getRevision()
    const body: SaveColumn[] = cols.map((column) => ({
      json_field: column.json_field.trim(),
      mnt_column: column.mnt_column.trim(),
      rule_type: column.rule_type,
      rule_value: column.rule_value?.trim() || null,
      required: column.required,
    }))

    savingRef.current = true
    setIsSaving(true)
    setSaveError('')
    setRefreshWarning('')
    try {
      await saveMapping(savedRecordType, body)
      if (!mountedRef.current) return

      // Xác minh lại từ server. acceptSavedRules tự so revision nên response này không thể
      // clear dirty hoặc đè editor nếu user đã chỉnh trong lúc PUT đang chạy.
      const previewRequestId = ++previewRequestRef.current
      setPreviewStatus('loading')
      const [rulesResult, metaResult, previewResult] = await Promise.allSettled([
        fetchRules(), fetchMeta(), fetchPreview(),
      ])
      if (!mountedRef.current) return

      const verifiedMeta = metaResult.status === 'fulfilled' && isUsableMeta(metaResult.value)
        ? metaResult.value
        : meta
      if (rulesResult.status === 'fulfilled') {
        try {
          assertRulesCoverRecordTypes(rulesResult.value, verifiedMeta ?? undefined)
          setRules(rulesResult.value)
          const accepted = draft.acceptSavedRules(rulesResult.value, savedRecordType, savedRevision)
          showToast(
            accepted ? 'Mapping saved and verified' : 'Saved snapshot; newer changes remain unsaved',
            accepted ? 'success' : 'warning',
          )
        } catch (error) {
          setRefreshWarning(`Mapping was saved, but verification was unsafe: ${errorMessage(error, 'invalid rules')}. Your draft was kept.`)
          showToast('Mapping saved, but verification was unsafe; draft kept', 'warning')
        }
      } else {
        setRefreshWarning(`Mapping was saved, but verification reload failed: ${errorMessage(rulesResult.reason, 'unknown error')}. Your draft was kept.`)
        showToast('Mapping saved, but verification reload failed; draft kept', 'warning')
      }

      if (verifiedMeta && verifiedMeta !== meta) {
        setMeta(verifiedMeta)
      } else {
        setRefreshWarning((current) => current || 'Mapping was saved, but metadata could not be refreshed. The current metadata is still in use.')
      }

      if (previewRequestId === previewRequestRef.current) {
        if (previewResult.status === 'fulfilled') {
          if (Array.isArray(previewResult.value.rows)) {
            setPreview(previewResult.value)
            setPreviewError('')
            setPreviewStatus('ready')
          } else {
            setPreviewError('Mapping preview response is invalid')
            setPreviewStatus('error')
          }
        } else {
          setPreviewError(errorMessage(previewResult.reason, 'Could not refresh mapping preview'))
          setPreviewStatus('error')
        }
      }
    } catch (error) {
      if (!mountedRef.current) return
      const message = errorMessage(error, 'Could not save mapping')
      setSaveError(message)
      showToast(message, 'error')
    } finally {
      savingRef.current = false
      if (mountedRef.current) setIsSaving(false)
    }
  }

  const editorReady = criticalStatus === 'ready' && !!meta
  const saveDisabled = !editorReady || !dirty || isSaving
  const saveLabel = !editorReady ? 'Unavailable' : isSaving ? 'Saving…' : dirty ? 'Save mapping' : 'Saved'

  return (
    <div className="px-4 sm:px-7 pt-[26px] pb-0 w-full flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Field mapping</h1>
        </div>
        <button type="button" onClick={() => void save()} disabled={saveDisabled}
          aria-label={isSaving ? `Saving ${recordType} mapping` : saveLabel}
          className={'inline-flex min-h-10 items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
            (!saveDisabled ? 'text-accent-text bg-accent border-accent cursor-pointer hover:brightness-95'
              : 'text-faint bg-surface2 border-border cursor-not-allowed')}>
          {dirty && !isSaving ? <SaveIcon size={14} /> : <CheckIcon size={14} />} {saveLabel}
        </button>
      </div>

      <div aria-live="polite" className="sr-only">
        {isSaving ? 'Saving mapping' : dirty ? 'Mapping has unsaved changes' : editorReady ? 'Mapping is saved' : ''}
      </div>

      {saveError && (
        <InlineMessage tone="error" message={saveError} />
      )}
      {refreshWarning && (
        <InlineMessage tone="warning" message={refreshWarning} />
      )}

      {criticalStatus === 'loading' && (
        <LoadingState label="Loading mapping rules and metadata…" />
      )}

      {criticalStatus === 'error' && (
        <ErrorState title="Mapping editor is unavailable" message={criticalError}
          onRetry={() => { void loadCritical(); void loadPreview() }} />
      )}

      {editorReady && (
        <>
          <MappingToolbar
            recordTypes={recordTypes} recordType={recordType} recordTypeDisabled={isSaving}
            onChangeRecordType={switchRecordType}
            search={search} onChangeSearch={setSearch}
            mappedCount={cols.filter((column) => column.json_field).length} totalCount={cols.length} />

          <div ref={panelRef} className="relative">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-[clamp(56px,8vw,110px)] items-start relative z-[2]">
              <SourcePanel
                sources={shownSources} usedFields={usedFields} removableFields={removableFields}
                selectedSrc={selectedSrc} searchText={search}
                onSelect={setSelectedSrc}
                onDragStart={setDragSrc}
                onDragEnd={() => setDragSrc(null)}
                onAddSource={addSource}
                onRemoveSource={removeSource} />

              <TargetPanel
                cols={cols} recordType={recordType} ruleTypes={ruleTypes}
                selectedSrc={selectedSrc} dragSrc={dragSrc}
                removedColumnName={draft.lastRemoved?.column.mnt_column ?? null}
                onMapSource={handleMapSource}
                onClearCol={draft.clearCol}
                onRemoveCol={removeColumn}
                onUndoRemove={undoRemoveColumn}
                onMoveCol={draft.moveCol}
                onChangeCol={draft.setColField}
                onAddColumn={addTargetColumn}
                onDragEnd={() => setDragSrc(null)} />
            </div>

            <ConnectorLines lines={lines} cols={cols} onUnmap={draft.unmapByDoubleClick} />
          </div>

          {previewStatus === 'loading' && <LoadingState compact label="Loading mapping preview…" />}
          {previewStatus === 'error' && (
            <ErrorState compact title="Preview unavailable" message={previewError} onRetry={() => void loadPreview()} />
          )}
          {previewStatus === 'ready' && (
            <PreviewSection rows={previewRows} cols={cols} recordType={recordType} />
          )}
        </>
      )}

      <Toast message={toast} />
    </div>
  )
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div role="status" className={`rounded-xl border border-border bg-surface text-muted text-[13px] ${compact ? 'p-4' : 'p-8 min-h-40 grid place-items-center'}`}>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="w-3 h-3 rounded-full bg-accent animate-pulse" />
        {label}
      </span>
    </div>
  )
}

function ErrorState({ title, message, onRetry, compact = false }: {
  title: string
  message: string
  onRetry: () => void
  compact?: boolean
}) {
  return (
    <div role="alert" className={`rounded-xl border border-accent/30 bg-accent-weak ${compact ? 'p-4' : 'p-6'}`}>
      <div className="font-semibold text-[13px] text-accent">{title}</div>
      <p className="my-1.5 text-[12px] text-muted">{message}</p>
      <button type="button" onClick={onRetry}
        className="mt-1 min-h-9 px-3 rounded-lg border border-accent text-accent text-[12px] font-semibold cursor-pointer hover:bg-surface outline-none focus-visible:ring-2 focus-visible:ring-accent">
        Retry
      </button>
    </div>
  )
}

function InlineMessage({ tone, message }: { tone: 'error' | 'warning'; message: string }) {
  const error = tone === 'error'
  return (
    <div role="alert" className={`px-3.5 py-3 rounded-lg border text-[12px] ${error
      ? 'border-accent/30 bg-accent-weak text-accent'
      : 'border-amber/30 bg-amber-bg text-amber'}`}>
      {message}
    </div>
  )
}

function assertCriticalData(rules: MappingRule[], meta: MappingMeta): void {
  if (!Array.isArray(rules) || rules.some((rule) => !isUsableRule(rule))) {
    throw new Error('Mapping rules response is invalid')
  }
  if (!isUsableMeta(meta)) throw new Error('Mapping metadata is incomplete')
  if (rules.some((rule) => !meta.rule_types.includes(rule.rule_type))) {
    throw new Error('Mapping rules contain an unsupported rule type')
  }
  assertRulesCoverRecordTypes(rules, meta)
}

function assertRulesCoverRecordTypes(rules: MappingRule[], meta?: MappingMeta): void {
  if (!Array.isArray(rules) || rules.length === 0 || rules.some((rule) => !isUsableRule(rule))) {
    throw new Error('Server returned invalid mapping rules')
  }
  if (meta) {
    const missing = meta.record_types.find((type) => !rules.some((rule) => rule.record_type === type))
    if (missing) throw new Error(`Server returned no rules for ${missing}`)
    const missingLocked = meta.record_types.find((type) => !rules.some((rule) => rule.record_type === type && rule.locked))
    if (missingLocked) throw new Error(`Server returned no locked standard rules for ${missingLocked}`)
  }
}

function isUsableMeta(meta: MappingMeta | null | undefined): meta is MappingMeta {
  return !!meta
    && isStringArray(meta.source_fields)
    && isStringArray(meta.record_types) && meta.record_types.length > 0
    && isStringArray(meta.rule_types) && meta.rule_types.length > 0
    && isStringArray(meta.standard_columns)
}

function isUsableRule(rule: MappingRule): boolean {
  return !!rule
    && Number.isFinite(rule.id)
    && Number.isInteger(rule.position) && rule.position > 0
    && typeof rule.record_type === 'string' && !!rule.record_type
    && typeof rule.json_field === 'string' && !!rule.json_field.trim()
    && typeof rule.mnt_column === 'string' && !!rule.mnt_column.trim()
    && typeof rule.rule_type === 'string' && !!rule.rule_type
    && typeof rule.required === 'boolean'
    && typeof rule.locked === 'boolean'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}
