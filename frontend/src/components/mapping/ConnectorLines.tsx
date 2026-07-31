// Các đường cong nối "field nguồn" (panel trái) tới "cột MNT" (panel phải).
// Hai phần: hook đo toạ độ thật trên DOM (useConnectorLines) + lớp SVG vẽ đè lên (ConnectorLines).

import { useState, useCallback, useLayoutEffect, type RefObject } from 'react'
import type { Col, Line } from '../../lib/mappingRules'

// Sau khi React render xong, trình duyệt còn co giãn/nạp font thêm vài trăm ms nên toạ độ
// đo ngay lập tức có thể lệch → đo lại vài nhịp cho chắc.
const REMEASURE_DELAYS_MS = [40, 150, 350]

// Đo vị trí hai đầu của mỗi đường nối, tính theo toạ độ TRONG khung panel.
// `redrawKey` là bất kỳ giá trị nào mà khi nó đổi thì bố cục cũng đổi (vd ô tìm kiếm) → cần đo lại.
export function useConnectorLines(
  panelRef: RefObject<HTMLDivElement | null>,
  cols: Col[],
  redrawKey: unknown,
): Line[] {
  const [lines, setLines] = useState<Line[]>([])

  const measure = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    const panelBox = panel.getBoundingClientRect()
    const out: Line[] = []
    for (const c of cols) {
      if (!c.json_field) continue // cột chưa map thì không có đường nối
      // Đo tới TÂM của chấm neo (không phải tâm cả thẻ) để đường nối trùng đúng chấm xanh.
      const source = panel.querySelector(`[data-src-anchor="${CSS.escape(c.json_field)}"]`)
      const target = panel.querySelector(`[data-tgt-anchor="${CSS.escape(c.key)}"]`)
      if (!source || !target) continue // nguồn đang bị ô tìm kiếm lọc mất → bỏ qua
      const a = source.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      out.push({
        key: c.key,
        x1: a.left + a.width / 2 - panelBox.left,
        y1: a.top + a.height / 2 - panelBox.top,
        x2: b.left + b.width / 2 - panelBox.left,
        y2: b.top + b.height / 2 - panelBox.top,
      })
    }
    setLines(out)
  }, [panelRef, cols])

  // useLayoutEffect (không phải useEffect): chạy TRƯỚC khi trình duyệt vẽ ra màn hình
  // → đường nối không bị "nhảy" một nhịp sau nội dung.
  useLayoutEffect(() => {
    measure()
    const timers = REMEASURE_DELAYS_MS.map((d) => setTimeout(measure, d))
    window.addEventListener('resize', measure)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', measure)
    }
  }, [measure, redrawKey])

  return lines
}

// Lớp SVG phủ lên hai panel. Chỉ có nghĩa khi 2 panel nằm ngang (md+); màn hẹp stack dọc thì ẩn.
// Đường của cột KHÔNG khoá: double-click để gỡ nối (vùng bấm dày trong suốt cho dễ trúng).
export function ConnectorLines({ lines, cols, onUnmap }: {
  lines: Line[]
  cols: Col[]
  onUnmap: (colKey: string) => void
}) {
  return (
    <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-[1] overflow-visible">
      {lines.map((l) => {
        // Đường cong Bézier: hai điểm điều khiển đẩy ngang ra để nét uốn mềm thay vì gấp khúc
        const dx = Math.max(36, Math.abs(l.x2 - l.x1) * 0.45)
        const d = `M ${l.x1} ${l.y1} C ${l.x1 + dx} ${l.y1}, ${l.x2 - dx} ${l.y2}, ${l.x2} ${l.y2}`
        const unlockable = cols.some((c) => c.key === l.key && !c.locked)
        return (
          <g key={l.key}>
            {unlockable && (
              <path d={d} fill="none" stroke="transparent" strokeWidth={16}
                className="pointer-events-auto cursor-pointer" onDoubleClick={() => onUnmap(l.key)}>
                <title>Double-click to unmap</title>
              </path>
            )}
            <path d={d} fill="none" stroke="var(--green)" strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
          </g>
        )
      })}
    </svg>
  )
}
