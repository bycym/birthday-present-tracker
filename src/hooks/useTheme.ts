import { useEffect } from 'react'
import type { Settings } from '@/types'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function resolve(theme: Settings['theme']): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Applies the stored theme and palette to <html>: `.dark` drives light/dark,
 * `data-palette` selects the colour set. Both are plain CSS variable swaps.
 */
export function useTheme(theme: Settings['theme'], palette: Settings['palette']): void {
  useEffect(() => {
    document.documentElement.dataset.palette = palette
  }, [palette])

  useEffect(() => {
    const root = document.documentElement
    const apply = () => root.classList.toggle('dark', resolve(theme) === 'dark')

    apply()
    if (theme !== 'system') return

    const media = window.matchMedia?.(DARK_QUERY)
    media?.addEventListener('change', apply)
    return () => media?.removeEventListener('change', apply)
  }, [theme])
}
