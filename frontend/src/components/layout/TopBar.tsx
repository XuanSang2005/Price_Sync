// Thanh trên cùng: nút menu, tên hệ thống, đèn kết nối, chuông cảnh báo, nút đổi theme.

import type { EventSummary } from '../../types'
import { useTheme } from '../../lib/theme'
import { SyncIcon, SunIcon, MoonIcon, MenuIcon } from '../icons'
import { AlertsBell } from './AlertsBell'

export function TopBar({ connected, attention, notifOpen, onToggleNotif, onCloseNotif, onOpenMenu, onCloseMenu, onToggleMenu }: {
  connected: boolean
  attention: EventSummary[]
  notifOpen: boolean
  onToggleNotif: () => void
  onCloseNotif: () => void
  onOpenMenu: () => void
  onCloseMenu: () => void
  onToggleMenu: () => void
}) {
  const { theme, toggle } = useTheme()

  return (
    <header className="h-[58px] flex-none border-b border-border bg-surface flex items-center justify-between px-[22px] relative z-20">
      <div className="flex items-center gap-[11px]">
        {/* Hamburger: hover để mở sidebar, bấm để ghim mở/đóng */}
        <button
          onMouseEnter={onOpenMenu}
          onMouseLeave={onCloseMenu}
          onClick={onToggleMenu}
          className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border flex-none"
          title="Menu"
          aria-label="Open menu"
        >
          <MenuIcon size={18} />
        </button>
        <div className="w-[27px] h-[27px] rounded-md bg-accent-weak text-accent grid place-items-center flex-none">
          <SyncIcon size={15} />
        </div>
        <div className="font-semibold text-[15px] tracking-tight">Price integration console</div>
      </div>

      <div className="flex items-center gap-[11px]">
        <span className="flex items-center gap-[7px] text-[12.5px] font-medium border border-border px-3 py-1 rounded-full bg-surface2">
          {/* chấm nhấp nháy (animation 'pip' khai báo trong index.css) */}
          <span
            className={'w-2 h-2 rounded-full ' + (connected ? 'bg-green' : 'bg-accent')}
            style={{ animation: 'pip 2.4s ease-in-out infinite' }}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </span>

        <AlertsBell attention={attention} open={notifOpen} onToggle={onToggleNotif} onClose={onCloseNotif} />

        <button
          onClick={toggle}
          className="w-[34px] h-[34px] rounded-lg border border-border bg-surface2 text-fg grid place-items-center cursor-pointer hover:bg-border"
          title="Toggle theme"
        >
          {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
      </div>
    </header>
  )
}
