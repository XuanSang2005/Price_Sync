import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MappingRule } from '../../types'
import { useMappingDraft } from './useMappingDraft'

const emptyRules: MappingRule[] = []
const reservedColumns = new Set<string>()

function renderDraft() {
  const showToast = vi.fn<(message: string, type?: 'success' | 'error' | 'warning') => void>()
  const hook = renderHook(() => useMappingDraft({
    rules: emptyRules,
    recordType: 'FDETL',
    reservedColumns,
    showToast,
  }))
  return { ...hook, showToast }
}

describe('useMappingDraft addColumn', () => {
  it('creates a target-only draft that can be mapped later', () => {
    const { result, showToast } = renderDraft()

    act(() => {
      expect(result.current.addColumn('', 'status', false)).toBe(true)
    })

    expect(result.current.cols).toEqual([
      expect.objectContaining({
        json_field: '',
        mnt_column: 'STATUS',
        rule_type: 'DIRECT',
        required: false,
        locked: false,
      }),
    ])
    expect(result.current.dirty).toBe(true)
    expect(showToast).not.toHaveBeenCalled()
  })

  it('still requires an MNT column name', () => {
    const { result, showToast } = renderDraft()

    act(() => {
      expect(result.current.addColumn('', '', false)).toBe(false)
    })

    expect(result.current.cols).toEqual([])
    expect(showToast).toHaveBeenCalledWith('Enter an MNT column', 'error')
  })
})
