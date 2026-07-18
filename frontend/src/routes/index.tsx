import { createFileRoute, redirect } from '@tanstack/react-router'

// "/" không có trang riêng → tự chuyển sang "/events" (danh sách)
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/events' })
  },
})
