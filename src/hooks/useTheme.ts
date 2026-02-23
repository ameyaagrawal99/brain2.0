import { useEffect } from 'react'
import { useBrainStore } from '@/store/useBrainStore'

export function useTheme() {
  const settings = useBrainStore((s) => s.settings)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // Dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark =
      settings.themeMode === 'dark' ||
      (settings.themeMode === 'system' && prefersDark)

    root.classList.toggle('dark', isDark)

    // Color theme
    root.removeAttribute('data-theme')
    if (settings.themeColor !== 'indigo') {
      root.setAttribute('data-theme', settings.themeColor)
    }

    // Font
    body.classList.toggle('font-serif-body', settings.fontMode === 'serif')
  }, [settings.themeMode, settings.themeColor, settings.fontMode])
}
