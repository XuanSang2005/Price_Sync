import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type { EventSummary } from '../../types'

// File index trong folder events/ → đường dẫn "/events" (trang list)
export const Route = createFileRoute('/events/')({
  component: EventsPage,
})

function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([])

  useEffect(() => {
    fetch('/api/v1/events')
      .then((response) => response.json())
      .then((data: EventSummary[]) => setEvents(data))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Events</h1>
      <table className="w-full bg-white shadow rounded-lg overflow-hidden text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Batch</th>
            <th className="p-3">Ver</th>
            <th className="p-3">Status</th>
            <th className="p-3">Generated</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="p-3">
                {/* Click ID → sang trang detail */}
                <Link
                  to="/events/$id"
                  params={{ id: String(event.id) }}
                  className="text-blue-600 hover:underline"
                >
                  {event.id}
                </Link>
              </td>
              <td className="p-3 font-medium">{event.batch_id}</td>
              <td className="p-3">{event.version}</td>
              <td className="p-3">{event.status}</td>
              <td className="p-3 text-gray-500">{event.generated_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
