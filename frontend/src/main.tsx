import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { routeTree } from './routeTree.gen' // plugin tự sinh - đừng sửa tay

// Tạo router từ cây route (plugin sinh ra từ thư mục routes/)
const router = createRouter({ routeTree })

// Đăng ký kiểu router để Link/useParams được TypeScript kiểm tra (type-safe)
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
