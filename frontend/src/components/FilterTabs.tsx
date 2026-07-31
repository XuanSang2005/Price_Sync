// Nhóm tab lọc theo trạng thái. Trước đây chuỗi class của tab nằm riêng trong trang Events;
// bảng record cũng cần đúng kiểu tab đó nên tách ra đây, sửa kiểu tab giờ chỉ sửa một chỗ.
// counts (tuỳ chọn): in số lượng ngay trên tab để biết có bao nhiêu cái trước khi bấm.

export function FilterTabs({ tabs, active, onChange, counts }: {
  tabs: string[]
  active: string
  onChange: (tab: string) => void
  counts?: Map<string, number>
}) {
  return (
    <div className="flex gap-[3px] p-[3px] bg-surface2 border border-border rounded-lg flex-wrap">
      {tabs.map((tab) => {
        const isActive = active === tab
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={'text-[12px] px-3 py-[5px] rounded-md border-none cursor-pointer whitespace-nowrap ' +
              (isActive ? 'bg-surface text-fg font-semibold shadow-[var(--shadow)]' : 'bg-transparent text-muted font-medium')}
          >
            {tab === 'all' ? 'All' : tab}
            {counts && (
              <span className={'ml-1.5 font-mono ' + (isActive ? 'text-muted' : 'text-faint')}>
                {counts.get(tab) ?? 0}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
