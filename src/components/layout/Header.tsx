import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, Plus, RefreshCw, Settings, LayoutGrid, Table2, Sun, Moon,
  Wand2, Kanban, PanelLeft, Sparkles, ChevronDown, Star, X, Network,
} from 'lucide-react'
import { differenceInYears, differenceInMonths } from 'date-fns'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/sheet'

const VIEW_MODES: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'card',  Icon: LayoutGrid, label: 'Cards' },
  { mode: 'table', Icon: Table2,     label: 'Table' },
  { mode: 'board', Icon: Kanban,     label: 'Board' },
  { mode: 'graph', Icon: Network,    label: 'Graph' },
]

function getElapsedShort(dateStr: string) {
  const now = new Date()
  const d   = new Date(dateStr + 'T12:00:00')
  const years  = differenceInYears(now, d)
  const months = differenceInMonths(now, d) % 12
  if (years === 0 && months === 0) return 'This month'
  if (years === 0) return `${months}mo ago`
  if (months === 0) return `${years}yr ago`
  return `${years}yr ${months}mo`
}

export function Header() {
  const viewMode             = useBrainStore((s) => s.viewMode)
  const setViewMode          = useBrainStore((s) => s.setViewMode)
  const isSyncing            = useBrainStore((s) => s.isSyncing)
  const setShowNewRow        = useBrainStore((s) => s.setShowNewRow)
  const setShowSettings      = useBrainStore((s) => s.setShowSettings)
  const setShowAIPanel       = useBrainStore((s) => s.setShowAIPanel)
  const settings             = useBrainStore((s) => s.settings)
  const updateSettings       = useBrainStore((s) => s.updateSettings)
  const showSidebar          = useBrainStore((s) => s.showSidebar)
  const setShowSidebar       = useBrainStore((s) => s.setShowSidebar)
  const specialDays          = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const setShowNewMilestone  = useBrainStore((s) => s.setShowNewMilestone)
  const demoMode             = settings.demoMode

  const { refresh } = useSheetSync()

  const [showNewMenu,    setShowNewMenu]    = useState(false)
  const [showMemories,   setShowMemories]   = useState(false)

  const newMenuRef    = useRef<HTMLDivElement>(null)
  const memoriesRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) setShowNewMenu(false)
      if (memoriesRef.current && !memoriesRef.current.contains(e.target as Node)) setShowMemories(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'n') { e.preventDefault(); setShowNewRow(true) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [setShowNewRow])

  const today   = new Date().toISOString().slice(0, 10)
  const todayMD = today.slice(5)

  const todayMilestones       = specialDays.filter(d => d.date === today)
  const anniversaryMilestones = specialDays.filter(d => d.date !== today && d.date.slice(5) === todayMD)
  const specialCount          = todayMilestones.length + anniversaryMilestones.length

  const toggleDark = () => {
    const next = settings.themeMode === 'dark' ? 'light' : 'dark'
    updateSettings({ themeMode: next })
  }

  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-13 sm:h-14 flex items-center gap-1.5 sm:gap-2">

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0',
            showSidebar
              ? 'text-brand bg-brand/10 shadow-sm shadow-brand/10'
              : 'text-ink3 hover:bg-hover hover:text-ink'
          )}
          title="Toggle sidebar (⌘B)"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mr-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand/20 to-purple-500/20 border border-brand/20 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-brand" />
          </div>
          <span className="font-bold text-sm text-ink hidden sm:block tracking-tight">Brain</span>
          {demoMode && (
            <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
              Demo
            </span>
          )}
        </div>

        {/* View toggle — desktop segmented control */}
        <div className="hidden sm:flex items-center bg-surface2 border border-border rounded-xl p-0.5 gap-0.5 mr-auto">
          {VIEW_MODES.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center gap-1.5 h-7 px-2.5 rounded-[9px] text-xs font-medium transition-all',
                viewMode === mode
                  ? 'bg-surface shadow-sm text-ink'
                  : 'text-ink3 hover:text-ink2'
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className={cn('hidden lg:block', viewMode === mode && 'lg:block')}>{label}</span>
            </button>
          ))}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 sm:hidden" />

        {/* ── Memories button ── */}
        <div className="relative" ref={memoriesRef}>
          <button
            onClick={() => setShowMemories(v => !v)}
            className={cn(
              'relative flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all',
              showMemories
                ? 'bg-rose-500/10 text-rose-500 shadow-sm'
                : specialCount > 0
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                  : 'text-ink3 hover:bg-hover hover:text-ink',
            )}
            title="Memories — today's milestones & anniversaries"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:block">Memories</span>
            {specialCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none animate-pulse">
                {specialCount}
              </span>
            )}
          </button>

          {showMemories && (
            <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[3.5rem] sm:top-full sm:mt-2 w-auto sm:w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 animate-slideUp overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">✨ Memories</p>
                  <p className="text-[10px] text-ink3">Today's special moments</p>
                </div>
                <button onClick={() => setShowMemories(false)} className="text-ink3 hover:text-ink p-1 rounded-lg hover:bg-hover">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {specialCount === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-3xl mb-2">🌙</div>
                    <p className="text-sm text-ink2 font-medium">No special memories today</p>
                    <p className="text-xs text-ink3 mt-1">Check back on your milestone dates!</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {todayMilestones.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3 px-1">🎉 Today</p>
                    )}
                    {todayMilestones.map(day => (
                      <button
                        key={day.id}
                        onClick={() => { setSelectedMilestone(day); setShowMemories(false) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200 dark:border-rose-800 hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/30 dark:hover:to-pink-900/30 transition-colors text-left"
                      >
                        <span className="text-2xl">{day.emoji || '🎉'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">{day.title}</p>
                          <p className="text-[11px] text-ink3">{getElapsedShort(day.date)}</p>
                        </div>
                      </button>
                    ))}

                    {anniversaryMilestones.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3 px-1 pt-1">🎂 Anniversary</p>
                    )}
                    {anniversaryMilestones.map(day => (
                      <button
                        key={day.id}
                        onClick={() => { setSelectedMilestone(day); setShowMemories(false) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-colors text-left"
                      >
                        <span className="text-2xl">{day.emoji || '🎂'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">{day.title}</p>
                          <p className="text-[11px] text-ink3">
                            {getElapsedShort(day.date)} · {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-border">
                <button
                  onClick={() => { setShowSidebar(true); setShowMemories(false) }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-brand hover:underline font-medium"
                >
                  <Star className="w-3 h-3" />
                  View all milestones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Panel button */}
        <button
          onClick={() => setShowAIPanel(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-brand/10 hover:text-brand transition-all"
          title="AI features"
        >
          <Wand2 className="w-4 h-4" />
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-all"
          title="Toggle dark mode"
        >
          {settings.themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Refresh */}
        {!demoMode && (
          <button
            onClick={refresh}
            disabled={isSyncing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-all disabled:opacity-40"
            title="Sync with Google Sheets"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} style={{ animationDuration: '1.6s' }} />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-all"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* New entry button */}
        <div className="hidden sm:flex items-center relative" ref={newMenuRef}>
          <button
            onClick={() => setShowNewRow(true)}
            className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-l-xl bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-all shadow-sm shadow-brand/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={() => setShowNewMenu(v => !v)}
            className="h-8 w-7 flex items-center justify-center rounded-r-xl bg-brand/90 text-white hover:bg-brand/80 transition-colors border-l border-white/20 shadow-sm shadow-brand/20"
            title="More options"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {showNewMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-lg z-50 animate-slideUp overflow-hidden p-1">
              <button
                onClick={() => { setShowNewRow(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-hover rounded-lg transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-brand" />
                </div>
                <div>
                  <p className="font-medium">New Entry</p>
                  <p className="text-ink3 text-[10px]">⌘N</p>
                </div>
              </button>
              <button
                onClick={() => { setShowNewMilestone(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-hover rounded-lg transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium">New Milestone</p>
                  <p className="text-ink3 text-[10px]">Special date</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
