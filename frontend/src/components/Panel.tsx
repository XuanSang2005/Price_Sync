// Khung thẻ dùng chung cho các khối có tiêu đề (log, payload, bảng records, attention...).
// Trước đây chuỗi class 'bg-surface border border-border rounded-xl overflow-hidden' bị chép lại
// ở gần chục chỗ; đổi kiểu thẻ giờ chỉ sửa tại đây.

import { useId, type ReactNode } from 'react'

export function Panel({ title, right, children }: {
  title?: ReactNode
  right?: ReactNode // nội dung canh phải trên thanh tiêu đề (nút, số đếm...)
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section
      className="bg-surface border border-border rounded-xl overflow-hidden min-w-0"
      aria-labelledby={title ? headingId : undefined}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-[18px] py-3.5 border-b border-border">
          <h2 id={headingId} className="m-0 min-w-0 font-semibold text-[13.5px]">{title}</h2>
          {right && <div className="flex-none">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
