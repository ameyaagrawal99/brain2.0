import { BookOpen, Plus, RefreshCw, Settings, LayoutGrid, Table2, Sun, Moon } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Header() {
  const viewMode       = useBrainStore((s) => s.viewMode)
  const setViewMode    = useBrainStore((s) => s.setViewMode)
  const isSyncing      = useBrainStore((s) => s.isSyncing)
  const setShowNewRow  = useBrainStore((s) => s.setShowNewRow)
  const setShowSettings= useBrainStore((s) => s.setShowSettings)
  const settings       = useBrainStore((s) => s.settings)
  const updateSettings = useBrainStore((s) => s.updateSettings)
  const demoMode       = settings.demoMode

  const { refresh } = useSheetSync()
  const { signOut } = useAuth()

  const toggleDark = () => {
    const next = settings.themeMode === 'dark' ? 'light' : 'dark'
    updateSettings({ themeMode: next })
  }

  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-brand" />
          </div>
          <span className="font-semibold text-sm text-ink hidden sm:block">Brain 2.0</span>
          {demoMode && (
            <span className="text-xs bg-warn/10 text-warn border border-warn/20 px-2 py-0.5 rounded-full font-medium">
              Demo
            </span>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-surface2 border border-border rounded-lg p-0.5 gap-0.5">
          {([['card', LayoutGrid], ['table', Table2]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                viewMode === mode
                  ? 'bg-surface shadow-sm text-ink'
                  : 'text-ink3 hover:text-ink'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors"
          title="Toggle dark mode"
        >
          {settings.themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh */}
        {!demoMode && (
          <button
            onClick={refresh}
            disabled={isSyncing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors disabled:opacity-40"
            title="Sync with Google Sheets"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin-slow')} />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* New entry */}
        <button
          onClick={() => setShowNewRow(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-l transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:block">New</span>
        </button>
      </div>
    </header>
  )
}
