import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TargetPanel } from './TargetPanel'

function renderPanel(onAddColumn: (jsonField: string, mntColumn: string, required: boolean) => boolean) {
  return render(
    <TargetPanel
      cols={[]}
      recordType="FDETL"
      ruleTypes={['DIRECT', 'DEFAULT', 'VALUE_MAP', 'SPLIT']}
      selectedSrc={null}
      dragSrc={null}
      removedColumnName={null}
      onMapSource={vi.fn<(colKey: string, sourceField: string) => void>()}
      onClearCol={vi.fn<(colKey: string) => void>()}
      onRemoveCol={vi.fn<(colKey: string) => void>()}
      onUndoRemove={vi.fn<() => void>()}
      onMoveCol={vi.fn<(index: number, direction: -1 | 1) => void>()}
      onChangeCol={vi.fn<(colKey: string) => void>()}
      onAddColumn={onAddColumn}
      onDragEnd={vi.fn<() => void>()}
    />,
  )
}

describe('TargetPanel add column form', () => {
  it('adds an MNT target without requiring a JSON source', async () => {
    const user = userEvent.setup()
    const onAddColumn = vi.fn<(jsonField: string, mntColumn: string, required: boolean) => boolean>(() => true)

    renderPanel(onAddColumn)

    await user.click(screen.getByRole('button', { name: 'Add target column' }))
    const targetInput = screen.getByRole('textbox', { name: /MNT column/i })
    expect(targetInput).toHaveFocus()

    await user.type(targetInput, 'status')
    await user.click(screen.getByRole('button', { name: 'Add target column' }))

    expect(onAddColumn).toHaveBeenCalledWith('', 'status', false)
  })

  it('creates a matching MNT name when a JSON source is entered', async () => {
    const user = userEvent.setup()
    const onAddColumn = vi.fn<(jsonField: string, mntColumn: string, required: boolean) => boolean>(() => true)
    renderPanel(onAddColumn)

    await user.click(screen.getByRole('button', { name: 'Add target column' }))
    await user.type(screen.getByRole('textbox', { name: /JSON source/i }), 'hello')

    expect(screen.getByRole('textbox', { name: /MNT column/i })).toHaveValue('HELLO')
    await user.click(screen.getByRole('button', { name: 'Add target column' }))

    expect(onAddColumn).toHaveBeenCalledWith('hello', 'HELLO', false)
  })
})
