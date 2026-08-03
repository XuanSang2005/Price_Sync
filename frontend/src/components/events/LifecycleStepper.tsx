// Dải 4 bước vòng đời batch: Received → Processing → Writing → (kết cục).
// Mỗi bước là một ô flex-1 nên các chấm luôn cách đều nhau; đường nối vẽ absolute canh đúng tâm chấm.

import type { Step, StepState } from '../../lib/eventStatus'
import { CheckIcon, XIcon } from '../icons'

// Màu của chấm + nhãn theo tình trạng của bước
function stepColor(state: StepState) {
  if (state === 'error') return { text: 'text-danger', bg: 'bg-danger-weak', ring: 'border-transparent' }
  if (state === 'current') return { text: 'text-muted', bg: 'bg-surface2', ring: 'border-border' }
  if (state === 'done') return { text: 'text-green', bg: 'bg-green-bg', ring: 'border-transparent' }
  return { text: 'text-faint', bg: 'bg-surface2', ring: 'border-border' }
}

// Ký hiệu bên trong chấm: ✓ xong, ✕ lỗi, • đang chạy, rỗng nếu chưa tới
function stepMark(state: StepState) {
  if (state === 'done') return <CheckIcon size={12} />
  if (state === 'error') return <XIcon size={11} />
  if (state === 'current') return '•'
  return ''
}

export function LifecycleStepper({ steps }: { steps: Step[] }) {
  return (
    <section aria-label="Event lifecycle" className="bg-surface border border-border rounded-xl px-4 sm:px-7 py-5 overflow-x-auto">
      <ol className="flex min-w-[420px]">
        {steps.map((s, i) => {
          const color = stepColor(s.state)
          return (
            <li key={s.label} className="flex-1 flex flex-col items-center relative min-w-0" aria-current={s.state === 'current' ? 'step' : undefined}>
              {/* đường nối sang bước kế tiếp — bước cuối thì không có */}
              {i < steps.length - 1 && (
                <div className={'absolute top-3 -translate-y-1/2 h-0.5 rounded ' + (s.state === 'done' ? 'bg-green' : 'bg-border')}
                  // chừa 13px mỗi đầu = bán kính chấm, để đường không đè lên chấm
                  style={{ left: 'calc(50% + 13px)', width: 'calc(100% - 26px)' }} />
              )}
              <span className={'relative z-10 w-6 h-6 rounded-full grid place-items-center border ' + color.bg + ' ' + color.text + ' ' + color.ring}>
                {stepMark(s.state)}
              </span>
              <span className={'mt-2 text-xs font-medium whitespace-nowrap ' + color.text}>{s.label}</span>
              <span className="sr-only">{s.state}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
