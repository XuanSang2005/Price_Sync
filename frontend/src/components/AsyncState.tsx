type RetryProps = { message: string; onRetry: () => void }

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="bg-surface border border-border rounded-xl px-6 py-10 text-center text-sm text-muted">
      <span className="inline-flex items-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-border2 border-t-primary animate-spin" aria-hidden="true" />
        {label}
      </span>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: RetryProps) {
  return (
    <div role="alert" className="bg-danger-weak border border-danger rounded-xl px-6 py-8 text-center">
      <div className="font-semibold text-danger">Unable to load data</div>
      <div className="text-sm text-muted mt-1">{message}</div>
      <button type="button" onClick={onRetry}
        className="mt-4 min-h-11 px-4 rounded-lg bg-surface border border-border font-semibold hover:bg-surface2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Try again
      </button>
    </div>
  )
}

export function StaleBanner({ message, onRetry }: RetryProps) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-amber bg-amber-bg px-3 py-2 text-xs text-amber">
      <span>Showing the last successful data. {message}</span>
      <button type="button" onClick={onRetry}
        className="min-h-9 px-3 rounded-md border border-amber font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Retry
      </button>
    </div>
  )
}
