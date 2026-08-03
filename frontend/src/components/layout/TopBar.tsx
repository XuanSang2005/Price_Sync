// Compact application header. Navigation is click-first; all icon controls keep
// a 44px touch target and expose their state to assistive technology.

import type { EventSummary } from '../../types'
import { useTheme } from '../../lib/theme'
import { PriceTagIcon, SunIcon, MoonIcon, MenuIcon } from '../icons'
import { AlertsBell } from './AlertsBell'

export function TopBar({
  connected,
  connectionUnavailable,
  attention,
  attentionCount,
  alertsUnavailable,
  notifOpen,
  menuOpen,
  onToggleNotif,
  onCloseNotif,
  onToggleMenu,
}: {
  connected: boolean | null
  connectionUnavailable: boolean
  attention: EventSummary[]
  attentionCount: number | null
  alertsUnavailable: boolean
  notifOpen: boolean
  menuOpen: boolean
  onToggleNotif: () => void
  onCloseNotif: () => void
  onToggleMenu: () => void
}) {
  const { theme, toggle } = useTheme()
  const connectionLabel = connectionUnavailable
    ? 'Connection status unavailable'
    : connected === null ? 'Checking connection' : connected ? 'Connected' : 'Disconnected'

  return (
    <header className="h-14 sm:h-[58px] flex-none border-b border-border bg-surface flex items-center justify-between gap-2 px-3 sm:px-[22px] relative z-20">
      <div className="flex items-center gap-2 sm:gap-[11px] min-w-0">
        <button
          id="navigation-menu-button"
          type="button"
          onClick={onToggleMenu}
          className="touch-target w-10 h-10 rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border flex-none"
          title="Navigation menu"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <MenuIcon size={18} />
        </button>
        <span aria-hidden="true" className="hidden sm:grid size-7 flex-none place-items-center text-primary">
          <PriceTagIcon size={20} />
        </span>
        <div className="min-w-0 font-semibold text-[14px] sm:text-[15px] tracking-tight truncate">
          <span className="sm:hidden">Price Sync</span>
          <span className="hidden sm:inline">Price integration console</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-[11px] flex-none">
        <span
          className="touch-target w-10 sm:w-auto flex items-center justify-center gap-[7px] text-[12.5px] font-medium border border-border px-0 sm:px-3 py-1 rounded-full bg-surface2"
          title={connectionLabel}
          aria-label={connectionLabel}
        >
          <span
            aria-hidden="true"
            className={'w-2 h-2 rounded-full ' + (connectionUnavailable
              ? 'bg-amber'
              : connected === null ? 'bg-faint' : connected ? 'bg-green' : 'bg-danger')}
            style={{ animation: 'pip 2.4s ease-in-out infinite' }}
          />
          <span className="hidden md:inline">{connectionUnavailable ? 'Unavailable' : connected === null ? 'Checking' : connected ? 'Connected' : 'Disconnected'}</span>
        </span>

        <AlertsBell
          attention={attention}
          totalCount={attentionCount}
          unavailable={alertsUnavailable}
          open={notifOpen}
          onToggle={onToggleNotif}
          onClose={onCloseNotif}
        />

        <button
          type="button"
          onClick={toggle}
          className="touch-target w-10 h-10 rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
      </div>
    </header>
  )
}
