// Trạng thái bản nháp của trang Mapping. Mọi thao tác sửa đi qua hook này để:
// - dirty/revision luôn chính xác;
// - response Save cũ không thể ghi đè thay đổi mới;
// - cột vừa xoá có thể khôi phục mà không chạm server.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MappingRule } from '../../types'
import { type Col, columnsFromRules, newDraftCol } from '../../lib/mappingRules'

const UNMAP_GUARD_MS = 350

type Options = {
  rules: MappingRule[]
  recordType: string
  reservedColumns: Set<string>
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

export type RemovedColumn = {
  column: Col
  index: number
}

export function useMappingDraft({ rules, recordType, reservedColumns, showToast }: Options) {
  const [cols, setCols] = useState<Col[]>([])
  const [dirty, setDirtyState] = useState(false)
  const [revision, setRevision] = useState(0)
  const [lastRemoved, setLastRemoved] = useState<RemovedColumn | null>(null)
  const revisionRef = useRef(0)
  const recordTypeRef = useRef(recordType)
  const lastMapAtRef = useRef(0)
  recordTypeRef.current = recordType

  const touch = useCallback(() => {
    revisionRef.current += 1
    setRevision(revisionRef.current)
    setDirtyState(true)
  }, [])

  // Server refresh chỉ được áp vào editor khi không có draft. Đây là hàng rào cuối
  // chống polling/reload sau Save nuốt thay đổi đang gõ.
  useEffect(() => {
    if (dirty) return
    setCols(columnsFromRules(rules, recordType))
    setLastRemoved(null)
  }, [rules, recordType, dirty])

  function mapSource(colKey: string, sourceField: string) {
    const column = cols.find((candidate) => candidate.key === colKey)
    if (!column) return false
    if (column.locked) {
      showToast('Standard column (Oracle contract) - source is fixed', 'warning')
      return false
    }
    if (column.json_field === sourceField) return true

    setCols((current) => current.map((candidate) => (
      candidate.key === colKey ? { ...candidate, json_field: sourceField } : candidate
    )))
    touch()
    lastMapAtRef.current = Date.now()
    return true
  }

  function clearCol(colKey: string) {
    const column = cols.find((candidate) => candidate.key === colKey)
    if (!column || column.locked || !column.json_field) return false
    setCols((current) => current.map((candidate) => (
      // `required` chỉ có nghĩa khi cột đang trỏ tới một source cụ thể.
      candidate.key === colKey ? { ...candidate, json_field: '', required: false } : candidate
    )))
    touch()
    return true
  }

  function unmapByDoubleClick(colKey: string) {
    if (Date.now() - lastMapAtRef.current <= UNMAP_GUARD_MS) return false
    return clearCol(colKey)
  }

  function removeCol(colKey: string) {
    const index = cols.findIndex((column) => column.key === colKey)
    if (index < 0 || cols[index].locked) return false
    setLastRemoved({ column: cols[index], index })
    setCols((current) => current.filter((column) => column.key !== colKey))
    touch()
    return true
  }

  function undoRemove() {
    if (!lastRemoved) return false
    const removed = lastRemoved
    setCols((current) => {
      if (current.some((column) => column.key === removed.column.key)) return current
      const next = [...current]
      next.splice(Math.min(removed.index, next.length), 0, removed.column)
      return next
    })
    setLastRemoved(null)
    touch()
    return true
  }

  function moveCol(index: number, direction: -1 | 1) {
    const destination = index + direction
    if (index < 0 || destination < 0 || destination >= cols.length) return false
    if (cols[index].locked || cols[destination].locked) return false

    setCols((current) => {
      const next = [...current]
      ;[next[index], next[destination]] = [next[destination], next[index]]
      return next
    })
    touch()
    return true
  }

  function setColField(colKey: string, patch: Partial<Col>) {
    const column = cols.find((candidate) => candidate.key === colKey)
    if (!column || column.locked) return false
    const changed = Object.entries(patch).some(([key, value]) => column[key as keyof Col] !== value)
    if (!changed) return true

    setCols((current) => current.map((candidate) => (
      candidate.key === colKey ? { ...candidate, ...patch } : candidate
    )))
    touch()
    return true
  }

  function addColumn(jsonField: string, mntColumn: string, required: boolean) {
    const source = jsonField.trim().replace(/\s+/g, '_')
    const target = (mntColumn.trim() || source).replace(/\s+/g, '_').toUpperCase()
    if (!target) {
      showToast('Enter an MNT column', 'error')
      return false
    }

    if (cols.some((column) => column.mnt_column.toUpperCase() === target)) {
      showToast(`Column ${target} already exists`, 'error')
      return false
    }
    if (reservedColumns.has(target)) {
      showToast(`${target} is a standard MNT column - pick another name`, 'error')
      return false
    }

    // Source có thể để trống để tạo target trước rồi map bằng click/drag sau.
    // Draft chưa map vẫn bị validateMapping chặn trước khi Save xuống server.
    setCols((current) => [...current, newDraftCol(source, target, source ? required : false)])
    setLastRemoved(null)
    touch()
    return true
  }

  // Bỏ draft khi người dùng đã xác nhận đổi record type.
  function resetToRules(nextRecordType: string) {
    revisionRef.current += 1 // vô hiệu mọi snapshot Save cũ còn đang bay
    setRevision(revisionRef.current)
    setCols(columnsFromRules(rules, nextRecordType))
    setLastRemoved(null)
    setDirtyState(false)
  }

  // Chỉ nhận bản server nếu người dùng chưa sửa gì kể từ lúc bấm Save.
  function acceptSavedRules(nextRules: MappingRule[], savedRecordType: string, savedRevision: number) {
    if (revisionRef.current !== savedRevision || recordTypeRef.current !== savedRecordType) return false
    setCols(columnsFromRules(nextRules, savedRecordType))
    setLastRemoved(null)
    setDirtyState(false)
    return true
  }

  const getRevision = useCallback(() => revisionRef.current, [])

  return {
    cols,
    dirty,
    revision,
    lastRemoved,
    getRevision,
    mapSource,
    clearCol,
    unmapByDoubleClick,
    removeCol,
    undoRemove,
    moveCol,
    setColField,
    addColumn,
    resetToRules,
    acceptSavedRules,
  }
}
