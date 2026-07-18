import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventDetail } from '../../types'

// Route "/events/$id" — chi tiết 1 batch. "$id" = tham số động trong URL.
export const Route = createFileRoute('/events/$id')({
  component: EventDetailPage,
})

function EventDetailPage() {
  // đọc "id" từ URL (vd /events/107 → id = "107")
  const { id } = Route.useParams()

  // state: object detail, ban đầu null (chưa tải xong)
  const [detail, setDetail] = useState<EventDetail | null>(null)

  // gọi API mỗi khi id đổi
  useEffect(() => {
    fetch('/api/v1/events/' + id)
      .then((response) => response.json())
      .then((data: EventDetail) => setDetail(data))
  }, [id])

  // chưa có data thì hiện "Đang tải..."
  if (detail === null) {
    return <p className="text-gray-500">Đang tải...</p>
  }

  return (
    <div>
      <Link to="/events" className="text-blue-600 hover:underline">
        ← Về danh sách
      </Link>

      <h1 className="text-2xl font-bold my-4 text-gray-800">
        Batch {detail.batch_id}
      </h1>
      <p className="mb-6 text-gray-600">
        Status: <span className="font-medium">{detail.status}</span> · Version:{' '}
        {detail.version}
      </p>

      <h2 className="font-semibold mb-2 text-gray-700">Records</h2>
      <table className="w-full bg-white shadow rounded-lg overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="p-3">Change</th>
            <th className="p-3">Item</th>
            <th className="p-3">Store/Zone</th>
            <th className="p-3">Validation</th>
            <th className="p-3">Reason</th>
          </tr>
        </thead>
        <tbody>
          {detail.records.map((record, index) => (
            <tr key={index} className="border-t border-gray-100">
              <td className="p-3">{record.change_id}</td>
              <td className="p-3">{record.item_id}</td>
              <td className="p-3">{record.store_id_or_zone}</td>
              <td className="p-3">{record.validation_status}</td>
              <td className="p-3 text-gray-500">{record.set_aside_reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
