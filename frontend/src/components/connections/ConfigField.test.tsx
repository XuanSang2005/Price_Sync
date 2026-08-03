import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { saveConfig } from '../../lib/api'
import { ConfigField } from './ConfigField'

vi.mock('../../lib/api', () => ({
  saveConfig: vi.fn<(configKey: string, configValue: string) => Promise<void>>(),
}))

describe('ConfigField email editing', () => {
  const onSaved = vi.fn<(configKey: string, configValue: string) => void>()
  const showToast = vi.fn<(message: string, type?: 'success' | 'error' | 'warning') => void>()

  beforeEach(() => {
    vi.mocked(saveConfig).mockReset()
    onSaved.mockReset()
    showToast.mockReset()
  })

  it('saves a valid edited email and publishes the normalized value', async () => {
    vi.mocked(saveConfig).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ConfigField
        label="Sender email"
        configKey="alert_email_from"
        value="old@example.com"
        present
        onSaved={onSaved}
        showToast={showToast}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Sender email' }))
    const input = screen.getByLabelText('Sender email')
    await user.clear(input)
    await user.type(input, '  alerts@example.com  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saveConfig).toHaveBeenCalledWith('alert_email_from', 'alerts@example.com'))
    expect(onSaved).toHaveBeenCalledWith('alert_email_from', 'alerts@example.com')
    expect(showToast).toHaveBeenCalledWith('Saved Sender email')
  })

  it('keeps an invalid email in edit mode without calling the API', async () => {
    const user = userEvent.setup()
    render(
      <ConfigField
        label="Recipient email"
        configKey="alert_email_to"
        value="ops@example.com"
        present
        onSaved={onSaved}
        showToast={showToast}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Recipient email' }))
    const input = screen.getByLabelText('Recipient email')
    await user.clear(input)
    await user.type(input, 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address')
    expect(saveConfig).not.toHaveBeenCalled()
  })

  it('shows a typed error toast when the server rejects a save', async () => {
    vi.mocked(saveConfig).mockRejectedValue(new Error('Email was rejected'))
    const user = userEvent.setup()
    render(
      <ConfigField
        label="Sender email"
        configKey="alert_email_from"
        value="old@example.com"
        present
        onSaved={onSaved}
        showToast={showToast}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Sender email' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email was rejected')
    expect(showToast).toHaveBeenCalledWith('Email was rejected', 'error')
    expect(onSaved).not.toHaveBeenCalled()
  })
})
