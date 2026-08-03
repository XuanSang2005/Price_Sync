// One config-table value with keyboard-friendly editing and inline validation.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { saveConfig } from '../../lib/api'
import type { ToastType } from '../Toast'
import { EditIcon } from '../icons'

function isReadOnlyKey(configKey: string) {
  return configKey.startsWith('_')
}

function isIpv4(value: string) {
  const octets = value.split('.')
  return octets.length === 4 && octets.every((octet) => {
    if (!/^\d{1,3}$/.test(octet)) return false
    if (octet.length > 1 && octet.startsWith('0')) return false
    return Number(octet) <= 255
  })
}

// Client-side IPv6 validation is intentionally conservative. The API repeats
// the authoritative validation before persisting the value.
function isIpv6(value: string) {
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return false
  if ((value.match(/::/g) ?? []).length > 1) return false

  const [left = '', right = ''] = value.split('::')
  const groups = [...(left ? left.split(':') : []), ...(right ? right.split(':') : [])]
  const validGroups = groups.every((group, index) => {
    if (/^[0-9a-f]{1,4}$/i.test(group)) return true
    return index === groups.length - 1 && isIpv4(group)
  })
  if (!validGroups) return false

  const groupCount = groups.reduce((count, group) => count + (group.includes('.') ? 2 : 1), 0)
  return value.includes('::') ? groupCount < 8 : groupCount === 8
}

function isEmail(value: string) {
  if (value.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(value)) {
    return false
  }
  const localPart = value.slice(0, value.lastIndexOf('@'))
  return localPart.length <= 64 && !localPart.startsWith('.') && !localPart.endsWith('.') && !localPart.includes('..')
}

function normalize(configKey: string, value: string) {
  const trimmed = value.trim()
  if (configKey === 'ip_allowlist') {
    return [...new Set(trimmed.split(',').map((entry) => entry.trim()))].join(',')
  }
  if (configKey === 'replay_skew_min' && /^\d+$/.test(trimmed)) {
    return String(Number(trimmed))
  }
  return trimmed
}

export function validateConfigValue(configKey: string, rawValue: string): string | null {
  const value = rawValue.trim()
  if (!value) return 'Value is required'
  if (/\p{Cc}/u.test(value)) return 'Control characters are not allowed'

  if (configKey === 'alert_email_from' || configKey === 'alert_email_to') {
    // Covers the operational addresses accepted by the backend without allowing
    // display-name/header syntax in a value used directly by SimpleMailMessage.
    if (!isEmail(value)) {
      return 'Enter a valid email address'
    }
  }

  if (configKey === 'abort_threshold') {
    const threshold = Number(value)
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      return 'Enter a number from 0 to 1'
    }
  }

  if (configKey === 'replay_skew_min') {
    const minutes = Number(value)
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(minutes)) {
      return 'Enter an integer greater than or equal to 0'
    }
  }

  if (configKey === 'ip_allowlist') {
    const addresses = value.split(',').map((entry) => entry.trim())
    if (addresses.some((address) => !isIpv4(address) && !isIpv6(address))) {
      return 'Use comma-separated IPv4 or IPv6 addresses'
    }
  }

  if (configKey === 'xcenter_inbound_path') {
    const segments = value.split(/[\\/]/)
    if (value === '/' || segments.includes('..')) {
      return 'Enter a folder path without root or .. segments'
    }
  }

  if (configKey === 'filename_pattern') {
    if (value.includes('/') || value.includes('\\')) return 'Use a filename, not a path'
    if (!value.endsWith('.mnt') || !value.includes('<ts>')) {
      return 'Filename must end with .mnt and contain <ts>'
    }
    const placeholders = value.match(/<[^<>]+>/g) ?? []
    const supported = new Set(['<batch_id>', '<version>', '<ts>'])
    if (placeholders.some((placeholder) => !supported.has(placeholder))) {
      return 'Only <batch_id>, <version>, and <ts> placeholders are supported'
    }
    const remainder = value
      .replaceAll('<batch_id>', '')
      .replaceAll('<version>', '')
      .replaceAll('<ts>', '')
    if (remainder.includes('<') || remainder.includes('>')) return 'A placeholder is malformed'
  }

  return null
}

function inputOptions(configKey: string) {
  if (configKey === 'alert_email_from' || configKey === 'alert_email_to') {
    return { type: 'email', inputMode: 'email' as const, autoComplete: 'off' }
  }
  if (configKey === 'abort_threshold') {
    return { type: 'text', inputMode: 'decimal' as const, autoComplete: 'off' }
  }
  if (configKey === 'replay_skew_min') {
    return { type: 'text', inputMode: 'numeric' as const, autoComplete: 'off' }
  }
  return { type: 'text', inputMode: 'text' as const, autoComplete: 'off' }
}

export function ConfigField({ label, configKey, value, present, mono, editHint, onSaved, showToast }: {
  label: string
  configKey: string
  value: string
  present: boolean
  mono?: boolean
  editHint?: string
  onSaved: (configKey: string, value: string) => void
  showToast: (message: string, type?: ToastType) => void
}) {
  const generatedId = useId()
  const inputId = `config-${generatedId.replaceAll(':', '')}`
  const errorId = `${inputId}-error`
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const readOnly = isReadOnlyKey(configKey)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function cancel() {
    if (savingRef.current) return
    setDraft(value)
    setError(null)
    setEditing(false)
  }

  async function save() {
    if (savingRef.current) return
    const validationError = validateConfigValue(configKey, draft)
    if (validationError) {
      setError(validationError)
      return
    }

    const normalizedValue = normalize(configKey, draft)
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await saveConfig(configKey, normalizedValue)
      setDraft(normalizedValue)
      setEditing(false)
      showToast(`Saved ${label}`)
      onSaved(configKey, normalizedValue)
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save this value'
      setError(message)
      showToast(message, 'error')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!editing) return
    if (event.key === 'Enter') {
      event.preventDefault()
      void save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  const commonInputClass = `w-full min-h-9 py-[7px] px-2.5 border rounded-lg bg-surface text-fg text-[12px] outline-none ${mono ? 'font-mono' : ''}`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          title={readOnly ? undefined : `Config key: ${configKey}`}
          className="text-[11px] text-muted font-medium"
        >
          {label}
        </label>
        {!present ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-faint border border-border px-1.5 py-px rounded">not configured</span>
        ) : editing ? (
          <span className="flex gap-1">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="touch-target px-2 text-[11px] text-muted cursor-pointer bg-transparent border-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="touch-target px-2 text-[11px] font-semibold text-accent cursor-pointer bg-transparent border-none disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </span>
        ) : readOnly ? null : (
          <button
            type="button"
            onClick={() => { setError(null); setEditing(true) }}
            className="touch-target grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-muted cursor-pointer hover:bg-surface2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            title={`Edit ${label}`}
            aria-label={`Edit ${label}`}
            aria-controls={inputId}
          >
            <EditIcon size={14} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        value={editing ? draft : (present ? value : '')}
        readOnly={!editing}
        disabled={!present}
        aria-invalid={editing && !!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => { setDraft(event.target.value); setError(null) }}
        onKeyDown={handleKeyDown}
        placeholder={present ? undefined : 'Key is missing from the database'}
        spellCheck={false}
        {...inputOptions(configKey)}
        className={`${commonInputClass} ${editing ? 'border-border focus:border-accent' : 'border-border bg-surface2 break-all'} ${present ? '' : 'text-faint disabled:opacity-100'} ${error ? 'border-accent' : ''}`}
      />

      {error && (
        <p id={errorId} role="alert" className="m-0 text-[11px] leading-4 text-accent">
          {error}
        </p>
      )}
      {editing && !error && (
        <p className="m-0 text-[10px] leading-4 text-faint">
          {editHint ? `${editHint} · ` : ''}Enter to save · Esc to cancel
        </p>
      )}
    </div>
  )
}
