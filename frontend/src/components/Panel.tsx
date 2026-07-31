// Khung thẻ dùng chung cho các khối có tiêu đề (log, payload, bảng records, attention...).
// Trước đây chuỗi class 'bg-surface border border-border rounded-xl overflow-hidden' bị chép lại
// ở gần chục chỗ; đổi kiểu thẻ giờ chỉ sửa tại đây.

import type { ReactNode } from 'react'

export function Panel({ title, right, children }: {
  title?: ReactNode
  right?: ReactNode // nội dung canh phải trên thanh tiêu đề (nút, số đếm...)
  children: ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-border">
          <div className="font-semibold text-[13.5px]">{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}
