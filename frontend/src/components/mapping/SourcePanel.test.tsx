import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SourcePanel } from './SourcePanel'

describe('SourcePanel removable fields', () => {
  it('keeps the remove action available after a source is mapped', async () => {
    const user = userEvent.setup()
    const onRemoveSource = vi.fn<(field: string) => void>()

    render(
      <SourcePanel
        sources={['hello']}
        usedFields={new Set(['hello'])}
        removableFields={new Set(['hello'])}
        selectedSrc={null}
        searchText=""
        onSelect={vi.fn<(field: string | null) => void>()}
        onDragStart={vi.fn<(field: string) => void>()}
        onDragEnd={vi.fn<() => void>()}
        onAddSource={vi.fn<(field: string) => boolean>(() => true)}
        onRemoveSource={onRemoveSource}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove JSON field hello' }))

    expect(onRemoveSource).toHaveBeenCalledWith('hello')
  })
})
