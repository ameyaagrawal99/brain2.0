import { useEffect } from 'react'
import { useBrainStore } from '@/store/useBrainStore'

export function useTheme() {
  const settings = useBrainStore((s) => s.settings)

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    // App theme (full palette swap — takes priority over dark mode/accent)
    root.removeAttribute('data-app-theme')
    if (settings.appTheme !== 'default') {
      root.setAttribute('data-app-theme', settings.appTheme)
    }

    // Dark mode — fixed-palette themes (e.g. Parchment) don't have a dark variant
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark =
      settings.appTheme === 'default' &&
      (settings.themeMode === 'dark' ||
        (settings.themeMode === 'system' && prefersDark))

    root.classList.toggle('dark', isDark)

    // Color theme
    root.removeAttribute('data-theme')
    if (settings.appTheme === 'default' && settings.themeColor !== 'indigo') {
      root.setAttribute('data-theme', settings.themeColor)
    }

    // Font
    body.classList.toggle('font-serif-body', settings.fontMode === 'serif')
  }, [settings.appTheme, settings.themeMode, settings.themeColor, settings.fontMode])
}
