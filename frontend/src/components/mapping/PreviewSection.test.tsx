import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Col } from '../../lib/mappingRules'
import type { MappingPreviewRow } from '../../types'
import { PreviewSection } from './PreviewSection'

const mappedColumn: Col = {
  key: 'promo-code',
  json_field: 'promo_code',
  mnt_column: 'PROMO_CODE',
  rule_type: 'DIRECT',
  rule_value: null,
  required: false,
  locked: false,
}

const unmappedColumn: Col = {
  ...mappedColumn,
  key: 'hello',
  json_field: '',
  mnt_column: 'HELLO',
}

const previewRow: MappingPreviewRow = {
  before: { change_type: 'UPSERT', promo_code: 'PROMO_001' },
  fields: { change_type: 'UPSERT', promo_code: 'PROMO_001' },
  record_type: 'FDETL',
  after: null,
  mappable: false,
  note: null,
}

describe('PreviewSection', () => {
  it('removes an unmapped target column without removing the preview record', async () => {
    const user = userEvent.setup()
    render(
      <PreviewSection
        rows={[previewRow]}
        cols={[mappedColumn, unmappedColumn]}
        recordType="FDETL"
      />,
    )

    const afterTable = screen.getByRole('table')
    expect(within(afterTable).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'RECORD_TYPE',
      'PROMO_CODE',
    ])
    expect(within(afterTable).getByText('PROMO_001')).toBeInTheDocument()
    expect(within(afterTable).queryByText('HELLO')).not.toBeInTheDocument()
    expect(screen.queryByText(/unmappable/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show the before table' }))
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.queryByRole('columnheader', { name: 'HELLO' })).not.toBeInTheDocument()
  })
})
