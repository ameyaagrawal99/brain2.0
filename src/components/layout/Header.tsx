import { BookOpen, Plus, RefreshCw, Settings, LayoutGrid, Table2, Sun, Moon, Wand2, Kanban } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/sheet'

const VIEW_MODES: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'card',  Icon: LayoutGrid, label: 'Card view' },
  { mode: 'table', Icon: Table2,     label: 'Table view' },
  { mode: 'board', Icon: Kanban,     label: 'Task board' },
]

export function Header() {
  const viewMode        = useBrainStore((s) => s.viewMode)
  const setViewMode     = useBrainStore((s) => s.setViewMode)
  const isSyncing       = useBrainStore((s) => s.isSyncing)
  const setShowNewRow   = useBrainStore((s) => s.setShowNewRow)
  const setShowSettings = useBrainStore((s) => s.setShowSettings)
  const setShowAIPanel  = useBrainStore((s) => s.setShowAIPanel)
  const settings        = useBrainStore((s) => s.settings)
  const updateSettings  = useBrainStore((s) => s.updateSettings)
  const demoMode        = settings.demoMode

  const { refresh } = useSheetSync()

  const toggleDark = () => {
    const next = settings.themeMode === 'dark' ? 'light' : 'dark'
    updateSettings({ themeMode: next })
  }

  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center gap-2">

        {/* Logo */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand" />
          </div>
          <span className="font-semibold text-sm text-ink hidden sm:block truncate">Brain 2.0</span>
          {demoMode && (
            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Demo
            </span>
          )}
        </div>

        {/* View toggle — hidden on mobile (BottomNav handles it) */}
        <div className="hidden sm:flex items-center bg-surface2 border border-border rounded-lg p-0.5 gap-0.5">
          {VIEW_MODES.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                viewMode === mode ? 'bg-surface shadow-sm text-ink' : 'text-ink3 hover:text-ink'
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {/* AI Panel button — always visible */}
        <button
          onClick={() => setShowAIPanel(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-brand transition-colors"
          title="AI features"
        >
          <Wand2 className="w-4 h-4" />
        </button>

        {/* Dark mode */}
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
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} style={{ animationDuration: '1.6s' }} />
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

        {/* New entry — hidden on mobile (BottomNav has it) */}
        <button
          onClick={() => setShowNewRow(true)}
          className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg bg-brand text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New</span>
        </button>
      </div>
    </header>
  )
}
