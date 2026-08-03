// Accessible 14-hour bar chart. The backend supplies zero-filled buckets; the
// client normalizes once more so a partial/older response can never collapse
// the timeline into only the hours that had events.

import { useId } from 'react'
import type { EventHourBucket } from '../../types'

const BUCKET_COUNT = 14
const CHART_HEIGHT_PX = 112
const HOUR_MS = 60 * 60 * 1000

type ChartBucket = {
  start: Date
  count: number
  hourLabel: string
  dateLabel: string
  fullLabel: string
}

function startOfHour(date: Date): Date {
  const result = new Date(date)
  result.setMinutes(0, 0, 0)
  return result
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function normalizeBuckets(source: EventHourBucket[], now = new Date()): ChartBucket[] {
  const counts = new Map<number, number>()
  for (const bucket of source) {
    const parsed = new Date(bucket.hour)
    if (Number.isNaN(parsed.getTime())) continue
    counts.set(startOfHour(parsed).getTime(), bucket.event_count)
  }

  const anchor = startOfHour(now)
  const fullFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })

  return Array.from({ length: BUCKET_COUNT }, (_, index) => {
    const start = new Date(anchor.getTime() - (BUCKET_COUNT - 1 - index) * HOUR_MS)
    return {
      start,
      count: counts.get(start.getTime()) ?? 0,
      hourLabel: pad(start.getHours()),
      dateLabel: `${pad(start.getDate())}/${pad(start.getMonth() + 1)}`,
      fullLabel: fullFormatter.format(start),
    }
  })
}

export function EventsPerHourChart({ buckets, unavailable = false }: {
  buckets: EventHourBucket[] | null
  unavailable?: boolean
}) {
  const headingId = useId()
  const descriptionId = useId()
  const bars = buckets === null ? [] : normalizeBuckets(buckets)
  const maxCount = Math.max(1, ...bars.map((bucket) => bucket.count))
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'
  const total = bars.reduce((sum, bucket) => sum + bucket.count, 0)

  return (
    <figure aria-labelledby={headingId} aria-describedby={descriptionId} aria-busy={buckets === null && !unavailable} className="m-0 h-full bg-surface border border-border rounded-xl p-4 sm:p-[18px] flex flex-col gap-4 min-w-0">
      <figcaption className="flex items-start sm:items-baseline justify-between gap-2 flex-wrap">
        <h2 id={headingId} className="m-0 font-semibold text-[13.5px]">Events per hour</h2>
        <span id={descriptionId} className="text-[11px] text-muted">Last {BUCKET_COUNT} hours · {timezone}</span>
      </figcaption>

      {buckets === null ? (
        <div role={unavailable ? 'alert' : 'status'} className={'h-[154px] grid place-items-center text-[13px] text-center ' + (unavailable ? 'text-danger' : 'text-muted')}>
          {unavailable ? 'Hourly event data is unavailable.' : 'Loading hourly events…'}
        </div>
      ) : (
        <>
          <div aria-hidden="true" className="flex items-end gap-1 sm:gap-1.5 h-[154px] pt-2">
            {bars.map((bucket, index) => {
              const previous = bars[index - 1]
              const showDate = index === 0 || previous.start.getDate() !== bucket.start.getDate() ||
                previous.start.getMonth() !== bucket.start.getMonth()
              const height = bucket.count === 0
                ? 2
                : Math.max(4, Math.round((bucket.count / maxCount) * CHART_HEIGHT_PX))
              return (
                <div key={bucket.start.getTime()} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    title={`${bucket.fullLabel}: ${bucket.count} events`}
                    className={'w-full rounded-t-sm ' + (bucket.count === 0
                      ? 'bg-border2'
                      : bucket.count === maxCount ? 'bg-primary' : 'bg-accent-weak border border-primary/20')}
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[9px] sm:text-[9.5px] leading-none text-faint font-mono">{bucket.hourLabel}</span>
                  <span className="h-3 text-[8px] leading-none text-muted font-mono whitespace-nowrap">{showDate ? bucket.dateLabel : ''}</span>
                </div>
              )
            })}
          </div>

          <p className="sr-only">{total} events across the latest {BUCKET_COUNT} clock-hour buckets in {timezone}.</p>
          <table className="sr-only">
            <caption>Events per hour in {timezone}</caption>
            <thead><tr><th scope="col">Hour</th><th scope="col">Events</th></tr></thead>
            <tbody>
              {bars.map((bucket) => (
                <tr key={bucket.start.getTime()}><th scope="row">{bucket.fullLabel}</th><td>{bucket.count}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  )
}
