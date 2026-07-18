import { createRootRoute, Outlet, Link } from '@tanstack/react-router'

// __root = layout chung cho MỌI trang: thanh nav + chỗ hiện trang con (<Outlet/>)
export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-8 py-4 flex gap-6 items-center">
        <span className="font-bold text-gray-800">Price Sync</span>
        <Link
          to="/events"
          className="text-gray-600 hover:text-gray-900 [&.active]:text-blue-600 [&.active]:font-medium"
        >
          Events
        </Link>
      </nav>
      <main className="p-8">
        {/* trang con (theo URL) hiện vào đây */}
        <Outlet />
      </main>
    </div>
  )
}
