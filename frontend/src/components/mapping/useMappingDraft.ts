// Trạng thái "bản nháp cột" của trang mapping: danh sách cột đang chỉnh + mọi thao tác sửa nó.
// Tách khỏi giao diện để trang chính chỉ còn việc ghép các mảnh lại.
// Quy ước: MỌI thao tác sửa đều bật cờ `dirty` -> nút Save sáng lên, và bản nháp không bị auto-reload đè.

import { useState, useEffect, useRef } from 'react'
import type { MappingRule } from '../../types'
import { type Col, colFromRule, newDraftCol } from '../../lib/mappingRules'

// Sau khi vừa đặt nguồn cho một cột, cú click thứ hai của người dùng rất dễ bị hiểu nhầm
// thành double-click -> gỡ luôn nguồn vừa đặt. Chặn trong khoảng này.
const UNMAP_GUARD_MS = 350

type Options = {
  rules: MappingRule[]
  recordType: string
  reservedColumns: Set<string> // tên cột chuẩn -> cột tự thêm không được lấy
  showToast: (message: string) => void
}

export function useMappingDraft({ rules, recordType, reservedColumns, showToast }: Options) {
  const [cols, setCols] = useState<Col[]>([])
  const [dirty, setDirty] = useState(false)
  const lastMapAtRef = useRef(0) // mốc thời gian vừa map xong

  // Khi rules/recordType đổi → dựng lại cột nháp (theo position), giữ nguyên khi đang sửa dở
  useEffect(() => {
    if (dirty) return // đừng đè sửa CHƯA LƯU (đổi tab / auto-reload không nuốt edit); locked lấy từ server r.locked
    const list = rules
      .filter((r) => r.record_type === recordType)
      .sort((a, b) => a.position - b.position)
      .map(colFromRule)
    setCols(list)
  }, [rules, recordType, dirty])

  // ===== Gán nguồn vào một cột =====
  function mapSource(colKey: string, sourceField: string) {
    if (cols.find((c) => c.key === colKey)?.locked) { // cột chuẩn: item_id khoá cứng với ITEM, không cho đổi nguồn
      showToast('Standard column (Oracle contract) - source is fixed')
      return false
    }
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, json_field: sourceField } : c)))
    setDirty(true)
    lastMapAtRef.current = Date.now()
    return true
  }

  // Gỡ nguồn khỏi cột (bấm nút X) — luôn có hiệu lực ngay
  function clearCol(colKey: string) {
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, json_field: '' } : c)))
    setDirty(true)
  }

  // Gỡ nguồn bằng double-click (trên thẻ cột hoặc trên đường nối) — bỏ qua nếu vừa map xong
  function unmapByDoubleClick(colKey: string) {
    if (Date.now() - lastMapAtRef.current <= UNMAP_GUARD_MS) return
    clearCol(colKey)
  }

  function removeCol(colKey: string) {
    setCols((cs) => cs.filter((c) => c.key !== colKey))
    setDirty(true)
  }

  // Đổi chỗ cột i với cột liền kề (dir = -1 lên, +1 xuống)
  function moveCol(i: number, dir: -1 | 1) {
    setCols((cs) => {
      const j = i + dir
      if (j < 0 || j >= cs.length) return cs
      if (cs[i].locked || cs[j].locked) return cs // không đổi vị trí liên quan cột chuẩn
      const next = [...cs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setDirty(true)
  }

  // Sửa một vài thuộc tính của cột (rule_type, rule_value, required...)
  function setColField(colKey: string, patch: Partial<Col>) {
    setCols((cs) => cs.map((c) => (c.key === colKey ? { ...c, ...patch } : c)))
    setDirty(true)
  }

  // Thêm cột mới. Trả về true nếu thêm được (để form bên ngoài tự đóng lại).
  function addColumn(jsonField: string, mntColumn: string, required: boolean) {
    const jf = jsonField.trim()
    if (!jf) { showToast('Enter a JSON field'); return false }
    const mnt = (mntColumn.trim() || jf.toUpperCase()).replace(/\s+/g, '_')
    if (cols.some((c) => c.mnt_column === mnt)) { showToast('Column ' + mnt + ' already exists'); return false }
    // Tên dành riêng cho cột chuẩn: cột chuẩn của tab này đã có sẵn (case trên bắt), nên vào đây
    // nghĩa là đang lấy tên chuẩn của tab KHÁC (vd PRICE ở FDELE) — server sẽ 409, chặn ngay tại đây.
    if (reservedColumns.has(mnt)) { showToast(mnt + ' is a standard MNT column - pick another name'); return false }
    setCols((cs) => [...cs, newDraftCol(jf, mnt, required)])
    setDirty(true)
    return true
  }

  return {
    cols,
    dirty,
    setDirty,
    mapSource,
    clearCol,
    unmapByDoubleClick,
    removeCol,
    moveCol,
    setColField,
    addColumn,
  }
}
