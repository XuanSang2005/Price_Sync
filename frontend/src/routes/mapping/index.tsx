// Trang Field mapping: khai báo cột file MNT bằng cách nối field JSON của HQ vào cột đích.
// File này chỉ GHÉP các mảnh lại — chi tiết nằm ở:
//   lib/mappingRules.ts               rule engine + kiểu Col (logic thuần)
//   lib/mappingApi.ts                 gọi API
//   components/mapping/useMappingDraft  state bản nháp cột
//   components/mapping/*Panel, *Section giao diện từng khu

import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { MappingRule, MappingPreview, MappingMeta } from '../../types'
import { CheckIcon, SaveIcon } from '../../components/icons'
import { Toast, useToast } from '../../components/Toast'
import { fetchRules, fetchMeta, fetchPreview, saveMapping } from '../../lib/mappingApi'
import { useMappingDraft } from '../../components/mapping/useMappingDraft'
import { useConnectorLines, ConnectorLines } from '../../components/mapping/ConnectorLines'
import { MappingToolbar } from '../../components/mapping/MappingToolbar'
import { SourcePanel } from '../../components/mapping/SourcePanel'
import { TargetPanel } from '../../components/mapping/TargetPanel'
import { PreviewSection } from '../../components/mapping/PreviewSection'

export const Route = createFileRoute('/mapping/')({ component: MappingPage })

function MappingPage() {
  // ===== Dữ liệu từ server =====
  const [rules, setRules] = useState<MappingRule[]>([])
  const [meta, setMeta] = useState<MappingMeta | null>(null)
  const [preview, setPreview] = useState<MappingPreview | null>(null)

  // ===== Trạng thái thao tác trên màn hình =====
  const [recordType, setRecordType] = useState('FDETL')
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null) // field đang chọn (click-to-map)
  const [dragSrc, setDragSrc] = useState<string | null>(null) // field đang kéo
  const [search, setSearch] = useState('')
  const [customSources, setCustomSources] = useState<string[]>([]) // field người dùng tự khai, chưa map
  const panelRef = useRef<HTMLDivElement>(null)

  const { message: toast, showToast } = useToast()

  // ===== Danh sách ĐỘNG từ backend meta (không hardcode) =====
  const ruleTypes = meta?.rule_types ?? []
  const recordTypes = meta?.record_types ?? []
  // Tên cột chuẩn do BACKEND công bố (STANDARD_MNT_COLUMNS) — không hardcode ở đây.
  // Cột chuẩn của tab hiện tại đã nằm trong `cols` (locked); các tên còn lại là tên DÀNH RIÊNG,
  // cột tự thêm không được lấy (vd đặt PRICE ở FDELE → server 409, trước đây bị nuốt im lặng).
  const reservedColumns = new Set(meta?.standard_columns ?? [])

  const draft = useMappingDraft({ rules, recordType, reservedColumns, showToast })
  const { cols, dirty, setDirty } = draft

  const load = useCallback(() => {
    fetchRules().then(setRules).catch(() => {})
    fetchMeta().then(setMeta).catch(() => {})
    fetchPreview().then(setPreview).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  // Đang chọn nguồn (click-to-map) → Esc hoặc click ra ngoài panel để huỷ.
  useEffect(() => {
    if (!selectedSrc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedSrc(null) }
    const onDown = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setSelectedSrc(null) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [selectedSrc])

  // ===== Danh sách field nguồn hiển thị bên trái =====
  // Nguồn: source_fields động (reflection + extras) + field thấy trong preview thật
  const previewFields = preview?.rows?.[0] ? Object.keys(preview.rows[0].before) : []
  const sources = [...new Set([...(meta?.source_fields ?? []), ...previewFields, ...customSources,
    ...cols.map((c) => c.json_field).filter(Boolean)])] // gồm field của cột đã map → không biến mất sau Save
  const usedFields = new Set(cols.map((c) => c.json_field))
  const query = search.trim().toLowerCase()
  const shownSources = sources.filter((s) => !query || s.toLowerCase().includes(query))

  // Preview: chỉ lấy record đúng record_type đang chỉnh
  const previewRows = (preview?.rows ?? []).filter((r) => r.record_type === recordType)

  // Đường nối vẽ lại khi cột đổi, khi lọc bớt field nguồn, hoặc khi preview vừa về (panel dài ra)
  const lines = useConnectorLines(panelRef, cols, search + '·' + previewRows.length)

  // ===== Hành động =====
  function handleMapSource(colKey: string, sourceField: string) {
    draft.mapSource(colKey, sourceField)
    setSelectedSrc(null) // map xong (hoặc bị từ chối vì cột khoá) đều thoát chế độ chọn
  }

  function switchRecordType(next: string) {
    if (dirty && !confirm('Discard unsaved mapping changes?')) return
    setDirty(false) // bỏ nháp → useMappingDraft dựng lại cột từ rules của tab mới
    setRecordType(next)
  }

  // Khai một field nguồn MỚI (chỉ là ứng viên kéo được; thành luật thật khi map + Save)
  function addSource(name: string) {
    const clean = name.trim().replace(/\s+/g, '_')
    if (!clean) { showToast('Enter a field name'); return false }
    setCustomSources((cs) => [...new Set([...cs, clean])])
    return true
  }

  // Xoá một field nguồn TỰ THÊM (chỉ những field trong customSources). Field chuẩn/preview là field thật, không xoá.
  function removeSource(name: string) {
    setCustomSources((cs) => cs.filter((x) => x !== name))
  }

  function save() {
    if (cols.some((c) => !c.json_field.trim())) { showToast('Map every column to a source field first'); return }
    const body = cols.map((c, i) => ({
      record_type: recordType, position: i + 1, json_field: c.json_field, mnt_column: c.mnt_column,
      rule_type: c.rule_type, rule_value: c.rule_value?.trim() || null, required: c.required,
    }))
    saveMapping(recordType, body)
      .then(() => {
        showToast('Mapping saved')
        setCustomSources([])
        // Chỉ clear dirty KHI rules mới về (reload OK) → nếu GET lỗi thì giữ dirty, không revert âm thầm.
        fetchRules()
          .then((data) => { setRules(data); setDirty(false) })
          .catch(() => showToast('Saved - reload failed, please refresh'))
        fetchMeta().then(setMeta).catch(() => {})
        fetchPreview().then(setPreview).catch(() => {})
      })
      // Server từ chối (vd 409 chiếm dụng tên cột chuẩn) → hiện đúng lý do, đừng nuốt thành "Save failed".
      .catch((err: Error) => showToast(err.message))
  }

  return (
    // pb-0: thanh preview dính ở đáy tự có padding riêng — để pb-11 như các trang khác
    // sẽ thành 44px trống dưới thanh (nó là phần tử cuối trang)
    <div className="px-7 pt-[26px] pb-0 w-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[21px] font-semibold tracking-tight">Field mapping</h1>
          <p className="mt-[5px] text-[13px] text-muted">
            Drag a source field onto a target column. JSON order is free; the MNT file follows the target order top→bottom.
          </p>
        </div>
        <button onClick={save} disabled={!dirty}
          className={'inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg border ' +
            (dirty ? 'text-accent-text bg-accent border-accent cursor-pointer hover:brightness-95' : 'text-faint bg-surface2 border-border cursor-not-allowed')}>
          {dirty ? <SaveIcon size={14} /> : <CheckIcon size={14} />} {dirty ? 'Save mapping' : 'Saved'}
        </button>
      </div>

      <MappingToolbar
        recordTypes={recordTypes} recordType={recordType} onChangeRecordType={switchRecordType}
        search={search} onChangeSearch={setSearch}
        mappedCount={cols.filter((c) => c.json_field).length} totalCount={cols.length} />

      {/* ===== Hai panel + lớp đường nối phủ lên trên ===== */}
      <div ref={panelRef} className="relative">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-[clamp(56px,8vw,110px)] items-start relative z-[2]">
          <SourcePanel
            sources={shownSources} usedFields={usedFields} customSources={customSources}
            selectedSrc={selectedSrc} searchText={search}
            onSelect={setSelectedSrc}
            onDragStart={setDragSrc}
            onDragEnd={() => setDragSrc(null)}
            onAddSource={addSource}
            onRemoveSource={removeSource} />

          <TargetPanel
            cols={cols} recordType={recordType} ruleTypes={ruleTypes}
            selectedSrc={selectedSrc} dragSrc={dragSrc}
            onMapSource={handleMapSource}
            onClearCol={draft.clearCol}
            onUnmapByDoubleClick={draft.unmapByDoubleClick}
            onRemoveCol={draft.removeCol}
            onMoveCol={draft.moveCol}
            onChangeCol={draft.setColField}
            onAddColumn={draft.addColumn}
            onDragEnd={() => setDragSrc(null)} />
        </div>

        <ConnectorLines lines={lines} cols={cols} onUnmap={draft.unmapByDoubleClick} />
      </div>

      <PreviewSection rows={previewRows} cols={cols} recordType={recordType} />

      <Toast message={toast} />
    </div>
  )
}
