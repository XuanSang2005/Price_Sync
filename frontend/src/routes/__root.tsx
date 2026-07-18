import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventSummary } from '../types'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime } from '../utils/format'

// __root = layout chung cho MỌI trang: header trên cùng + chỗ hiện trang con (<Outlet/>)
export const Route = createRootRoute({
  component: RootLayout,
})

// Một link trên thanh nav — TanStack tự thêm class "active" khi đang ở trang đó
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 [&.active]:text-zinc-100 [&.active]:bg-zinc-800"
    >
      {label}
    </Link>
  )
}

// Các trạng thái operator cần để mắt tới (hiện trong sidebar "Cần chú ý")
const ATTENTION_STATUSES = ['FAILED', 'PENDING_WRITE', 'PARTIAL']

function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false) // sidebar đang mở hay không
  const [events, setEvents] = useState<EventSummary[]>([]) // dữ liệu cho sidebar

  // Mỗi lần mở sidebar → tải danh sách events mới nhất (để 2 mục luôn tươi)
  useEffect(() => {
    if (menuOpen) {
      fetch('/api/v1/events')
        .then((response) => response.json())
        .then((data: EventSummary[]) => setEvents(data))
    }
  }, [menuOpen])

  // Mục "Cần chú ý": batch đang FAILED / PENDING_WRITE / PARTIAL
  const needAttention = events.filter((event) => ATTENTION_STATUSES.includes(event.status))

  // Mục "Hoạt động gần đây": 5 batch mới nhất (id lớn nhất)
  const recentActivity = [...events].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* ===== Header: 3 vùng — logo trái / nav giữa / hamburger phải ===== */}
      <nav className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/60 shadow-lg shadow-black/30">
        <div className="max-w-screen-2xl mx-auto px-8 h-14 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Trái: chỉ wordmark, giữ clean. h-full + items-center = căn giữa dọc chính xác */}
          <div className="flex items-center h-full">
            <span className="text-2xl font-semibold tracking-tight text-zinc-100 leading-none">
              Price Sync
            </span>
          </div>

          {/* Giữa: nav canh giữa tuyệt đối (cột giữa của grid) */}
          <div className="flex items-center gap-1">
            <NavItem to="/events" label="Events" />
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/config" label="Config" />
          </div>

          {/* Phải: hamburger — hover vào là mở sidebar (wrapper ôm cả nút lẫn panel
              để chuột di từ nút xuống panel không bị coi là rời ra) */}
          <div
            className="justify-self-end relative h-14 flex items-center"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              aria-label="Mở bảng theo dõi"
              className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-zinc-800"
            >
              {/* icon hamburger vẽ bằng 3 vạch CSS thuần (không icon lib) */}
              <span className="block w-4 h-px bg-zinc-400" />
              <span className="block w-4 h-px bg-zinc-400" />
              <span className="block w-4 h-px bg-zinc-400" />
            </button>

            {/* ---- Sidebar thả xuống bên phải ---- */}
            {menuOpen && (
              <div className="absolute right-0 top-full w-80 max-h-[75vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 p-4">
                {/* Mục 1: Cần chú ý */}
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Cần chú ý {needAttention.length > 0 && '(' + needAttention.length + ')'}
                </div>
                {needAttention.length === 0 ? (
                  <p className="text-sm text-zinc-500 mb-4">Không có batch nào cần xử lý.</p>
                ) : (
                  <ul className="space-y-2 mb-4">
                    {needAttention.map((event) => (
                      <li key={event.id}>
                        <Link
                          to="/events/$id"
                          params={{ id: String(event.id) }}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800"
                        >
                          <span className="text-sm text-zinc-200 truncate">{event.batch_id}</span>
                          <StatusBadge status={event.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-zinc-800 my-3" />

                {/* Mục 2: Hoạt động gần đây */}
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Hoạt động gần đây
                </div>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-zinc-500">Chưa có dữ liệu.</p>
                ) : (
                  <ul className="space-y-2">
                    {recentActivity.map((event) => (
                      <li key={event.id}>
                        <Link
                          to="/events/$id"
                          params={{ id: String(event.id) }}
                          className="block rounded-lg px-2 py-1.5 hover:bg-zinc-800"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-zinc-200 truncate">{event.batch_id}</span>
                            <StatusBadge status={event.status} />
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {formatDateTime(event.generated_at)}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Trang con (theo URL) hiện vào đây */}
      <main className="max-w-screen-2xl mx-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
