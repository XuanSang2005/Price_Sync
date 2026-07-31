// Khung thẻ cho một nhóm cấu hình: icon + tên + mô tả ở đầu, các ô ConfigField ở giữa,
// và một dòng ghi chú tuỳ chọn ở đáy.

import type { ReactNode } from 'react'

export function ConnectorCard({ icon, title, subtitle, children, footnote }: {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
  footnote?: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-[18px] flex flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <span className="w-[34px] h-[34px] rounded-lg bg-surface2 border border-border grid place-items-center flex-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px]">{title}</div>
          <div className="text-[12px] text-muted">{subtitle}</div>
        </div>
      </div>

      {children}

      {/* mt-auto đẩy ghi chú xuống đáy để các thẻ trong cùng hàng cao bằng nhau */}
      {footnote && (
        <div className="text-[11px] text-faint mt-auto pt-2 border-t border-border">{footnote}</div>
      )}
    </div>
  )
}
