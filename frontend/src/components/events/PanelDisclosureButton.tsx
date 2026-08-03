type PanelDisclosureButtonProps = {
  open: boolean
  controls: string
  label: string
  onToggle: () => void
}

/** Shared Show/Hide control for collapsible event panels. */
export function PanelDisclosureButton({ open, controls, label, onToggle }: PanelDisclosureButtonProps) {
  const action = open ? 'Hide' : 'Show'

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${action} ${label}`}
      className="inline-flex min-h-10 min-w-[68px] shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-primary cursor-pointer hover:bg-surface2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {action}
    </button>
  )
}
