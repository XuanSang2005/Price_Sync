// Thanh điều hướng bên trái: trượt ra khi rê chuột, thu vào khi rời.
// Chỉ lo hiển thị — việc mở/đóng do __root.tsx quyết định và truyền xuống.

import { Link } from '@tanstack/react-router'
import type { Health } from '../../types'
import { GridIcon, BellIcon, LinkIcon, ColumnsIcon } from '../icons'

// Class cho một mục nav (đổi theo đang chọn hay không)
function navClass(active: boolean) {
  return (
    'flex items-center gap-3 px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium cursor-pointer border border-transparent transition-colors ' +
    (active
      ? 'bg-accent-weak text-accent font-semibold'
      : 'text-muted hover:bg-surface2 hover:text-fg')
  )
}

// Tiêu đề nhóm ("Monitor", "Configure").
// topPad: nhóm thứ hai trở đi cần thở hơn nên truyền 'pt-4'.
function SectionLabel({ children, topPad = 'pt-1' }: { children: string; topPad?: string }) {
  return (
    <div className={'text-[11px] uppercase tracking-[0.06em] text-faint px-2.5 pb-2 font-semibold ' + topPad}>
      {children}
    </div>
  )
}

export function Sidebar({ open, health, attentionCount, onOpen, onClose, onNavigate }: {
  open: boolean
  health: Health | null
  attentionCount: number // số batch cần chú ý -> hiện badge đỏ ở mục Events
  onOpen: () => void
  onClose: () => void
  onNavigate: () => void // bấm vào một mục -> đóng sidebar
}) {
  return (
    <aside
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      className={
        'fixed left-0 top-0 h-screen w-[248px] z-40 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-out ' +
        // -translate-x-full = đẩy hẳn sang trái ngoài màn hình (ẩn), translate-x-0 = về vị trí thật (hiện)
        (open ? 'translate-x-0 shadow-2xl' : '-translate-x-full')
      }
    >
      <nav className="px-3 pt-5 pb-3.5 flex flex-col gap-[3px] flex-1 overflow-y-auto">
        <SectionLabel>Monitor</SectionLabel>

        {/* Link nhận hàm con -> TanStack cho biết mục này có đang được chọn hay không */}
        <Link to="/dashboard" className="block" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <GridIcon />
              <span>Dashboard</span>
            </div>
          )}
        </Link>

        <Link to="/events" className="block" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <BellIcon />
              <span className="flex-1">Events</span>
              {attentionCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent text-accent-text text-[10px] font-bold grid place-items-center">
                  {attentionCount}
                </span>
              )}
            </div>
          )}
        </Link>

        <SectionLabel topPad="pt-4">Configure</SectionLabel>

        <Link to="/connections" className="block" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <LinkIcon />
              <span>Connections</span>
            </div>
          )}
        </Link>

        <Link to="/mapping" className="block" onClick={onNavigate}>
          {({ isActive }) => (
            <div className={navClass(isActive)}>
              <ColumnsIcon />
              <span>Field mapping</span>
            </div>
          )}
        </Link>
      </nav>

      <div className="px-4 py-[13px] border-t border-border text-[11.5px] text-muted flex flex-col gap-[3px]">
        <div>Build {health?.version ?? 'dev'} · {health?.environment ?? 'LOCAL'}</div>
        <div className="font-mono text-[10.5px] text-faint">price-events · v1</div>
      </div>
    </aside>
  )
}
