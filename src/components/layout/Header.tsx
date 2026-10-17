import { useEffect, useRef, useState } from 'react'
import {
  CalendarHeart, X, Star, ChevronDown, Plus, Sun, Moon, Wand2, RefreshCw, LogIn, Settings,
} from 'lucide-react'
import { differenceInYears, differenceInMonths } from 'date-fns'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { cn } from '@/lib/utils'
import { coerceDate, monthDay, toLocalISODate } from '@/lib/date'

function getElapsedShort(dateStr: string) {
  const now    = new Date()
  const d      = new Date(dateStr + 'T12:00:00')
  const years  = differenceInYears(now, d)
  const months = differenceInMonths(now, d) % 12
  if (years === 0 && months === 0) return 'This month'
  if (years === 0) return `${months}mo ago`
  if (months === 0) return `${years}yr ago`
  return `${years}yr ${months}mo`
}

export function Header() {
  const isSyncing           = useBrainStore((s) => s.isSyncing)
  const lastSynced          = useBrainStore((s) => s.lastSyncedAt)
  const setShowNewRow       = useBrainStore((s) => s.setShowNewRow)
  const setShowNewMilestone = useBrainStore((s) => s.setShowNewMilestone)
  const setShowSettings     = useBrainStore((s) => s.setShowSettings)
  const setShowAIPanel      = useBrainStore((s) => s.setShowAIPanel)
  const showSidebar         = useBrainStore((s) => s.showSidebar)
  const setShowSidebar      = useBrainStore((s) => s.setShowSidebar)
  const settings            = useBrainStore((s) => s.settings)
  const updateSettings      = useBrainStore((s) => s.updateSettings)
  const setAuthState        = useBrainStore((s) => s.setAuthState)
  const specialDays         = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const demoMode            = settings.demoMode
  const { refresh }         = useSheetSync()

  const [showNewMenu,  setShowNewMenu]  = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  const newMenuRef    = useRef<HTMLDivElement>(null)
  const memoriesRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (newMenuRef.current    && !newMenuRef.current.contains(e.target as Node))    setShowNewMenu(false)
      if (memoriesRef.current   && !memoriesRef.current.contains(e.target as Node))   setShowMemories(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'n') { e.preventDefault(); setShowNewRow(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setShowNewRow])

  const today   = toLocalISODate()
  const todayMD = monthDay(today)
  const todayMs       = specialDays.filter(d => d.date === today)
  const anniversaryMs = specialDays.filter(d => d.date !== today && d.date.slice(5) === todayMD)
  const specialCount  = todayMs.length + anniversaryMs.length

  const syncDate = coerceDate(lastSynced)
  const syncAgo = syncDate ? (() => {
    const diff = Math.floor((Date.now() - syncDate.getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  })() : null

  const toggleDark = () => updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' })
  const exitDemo = () => {
    updateSettings({ demoMode: false })
    setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
  }

  const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-all shrink-0'

  return (
    <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border safe-top sm:ml-14">
      <div className="h-12 px-3 sm:px-4 flex items-center gap-2">

        {/* Mobile brand */}
        <div className="sm:hidden flex items-center gap-2 mr-1 shrink-0 whitespace-nowrap">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <span className="text-white font-black text-xs">B</span>
          </div>
          <span className="font-bold text-sm text-ink tracking-tight">Brain</span>
          {demoMode && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Demo</span>}
        </div>

        {/* Desktop: sidebar toggle hint */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className={cn(iconBtn, 'hidden sm:flex',
            showSidebar && 'text-brand bg-brand/10'
          )}
          title="Dashboard (stats, tasks, milestones)"
          aria-label="Dashboard (stats, tasks, milestones)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="14" height="14" rx="2" />
            <line x1="5.5" y1="1" x2="5.5" y2="15" />
          </svg>
        </button>

        <div className="flex-1" />

        {demoMode && (
          <button
            onClick={exitDemo}
            aria-label="Exit demo and sign in"
            className="flex items-center gap-1.5 h-8 px-2 rounded-lg border border-border bg-surface2 text-xs font-semibold text-ink2 hover:bg-hover hover:text-ink transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}

        {/* Memories */}
        <div className="relative" ref={memoriesRef}>
          <button
            onClick={() => setShowMemories(v => !v)}
            aria-label="Memories"
            className={cn(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-all relative',
              showMemories
                ? 'bg-rose-500/10 text-rose-500'
                : specialCount > 0
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                  : 'text-ink3 hover:bg-hover hover:text-ink',
            )}
          >
            <CalendarHeart className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Memories</span>
            {specialCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {specialCount}
              </span>
            )}
          </button>

          {showMemories && (
            <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-[3.25rem] sm:top-full sm:mt-1.5
              w-auto sm:w-80 bg-surface border border-border rounded-xl shadow-xl z-50 animate-scaleIn overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Memories</p>
                  <p className="text-[10px] text-ink3">Milestones that fall on today</p>
                </div>
                <button onClick={() => setShowMemories(false)} className={iconBtn} aria-label="Close memories">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {specialCount === 0 ? (
                  <div className="py-8 px-6 text-center">
                    <p className="text-sm text-ink2 font-semibold">Nothing today</p>
                    <p className="text-xs text-ink3 mt-1">Milestones and their anniversaries show up here on the day.</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {todayMs.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3 px-1">Today</p>
                    )}
                    {todayMs.map(day => (
                      <button key={day.id}
                        onClick={() => { setSelectedMilestone(day); setShowMemories(false) }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg
                          bg-rose-50 dark:bg-rose-900/20
                          border border-rose-200 dark:border-rose-800
                          hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors text-left"
                      >
                        <span className="text-2xl">{day.emoji || '🎉'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">{day.title}</p>
                          <p className="text-[11px] text-ink3">{getElapsedShort(day.date)}</p>
                        </div>
                      </button>
                    ))}
                    {anniversaryMs.length > 0 && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink3 px-1 pt-1">Anniversaries</p>
                    )}
                    {anniversaryMs.map(day => (
                      <button key={day.id}
                        onClick={() => { setSelectedMilestone(day); setShowMemories(false) }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg
                          bg-amber-50 dark:bg-amber-900/20
                          border border-amber-200 dark:border-amber-800
                          hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-left"
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
                <button onClick={() => { setShowSidebar(true); setShowMemories(false) }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-brand hover:underline font-medium">
                  <Star className="w-3 h-3" />View all milestones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI */}
        <button onClick={() => setShowAIPanel(true)} className={iconBtn} title="AI Assistant" aria-label="AI Assistant">
          <Wand2 className="w-4 h-4" />
        </button>

        {/* Dark mode */}
        <button onClick={toggleDark} className={iconBtn} title="Toggle theme" aria-label="Toggle theme">
          {settings.themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sync */}
        {!demoMode && (
          <button onClick={refresh} disabled={isSyncing} className={cn(iconBtn, isSyncing && 'opacity-50')}
            title={syncAgo ? `Synced ${syncAgo}` : 'Sync'}
            aria-label={syncAgo ? `Sync, last synced ${syncAgo}` : 'Sync'}>
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} style={{ animationDuration: '1.4s' }} />
          </button>
        )}

        {/* Mobile: the bottom nav owns "New", so settings sits here instead */}
        <button onClick={() => setShowSettings(true)} className={cn(iconBtn, 'sm:hidden')} title="Settings" aria-label="Settings">
          <Settings className="w-4 h-4" />
        </button>

        {/* New — split button */}
        <div className="hidden sm:flex items-center" ref={newMenuRef}>
          <button
            onClick={() => setShowNewRow(true)}
            aria-label="New entry"
            className="flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-l-lg
              bg-brand text-white text-xs font-semibold
              hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
          <button
            onClick={() => setShowNewMenu(v => !v)}
            aria-label="More new options"
            className="h-8 w-6 flex items-center justify-center rounded-r-lg
              bg-brand text-white hover:bg-brand/90
              border-l border-white/25 transition-colors"
            title="More options"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {showNewMenu && (
            <div className="absolute right-4 top-[3.25rem] w-52 bg-surface border border-border rounded-xl shadow-xl z-50 animate-scaleIn overflow-hidden p-1">
              <button onClick={() => { setShowNewRow(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ink hover:bg-hover rounded-lg transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 text-brand" />
                </div>
                <div>
                  <p className="font-medium text-sm">New Entry</p>
                  <p className="text-ink3 text-[11px]">Add a note or task</p>
                </div>
                <kbd className="ml-auto text-[10px] text-ink3">⌘N</kbd>
              </button>
              <button onClick={() => { setShowNewMilestone(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ink hover:bg-hover rounded-lg transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <CalendarHeart className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">New Milestone</p>
                  <p className="text-ink3 text-[11px]">Special date or memory</p>
                </div>
              </button>
              <div className="h-px bg-border mx-3 my-0.5" />
              <button onClick={() => { setShowSettings(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-ink hover:bg-hover rounded-lg transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-surface2 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="8" cy="8" r="2.5" />
                    <path d="M13.5 8a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                  </svg>
                </div>
                <p className="font-medium text-sm">Settings</p>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
