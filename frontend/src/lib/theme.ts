// Quản lý theme sáng/tối. Chỉ đổi thuộc tính data-theme trên <html>; CSS vars trong
// index.css lo phần đổi màu. Lưu lựa chọn vào localStorage để nhớ giữa các lần mở.
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'price-sync-theme'

function readInitial(): Theme {
  const applied = document.documentElement.dataset.theme
  if (applied === 'light' || applied === 'dark') return applied
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    apply(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // The selected theme still applies for this session when storage is blocked.
    }
  }, [theme])

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggle }
}
