import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Header }             from './Header'
import { NavRail }            from './NavRail'
import { FilterBar }          from './FilterBar'
import { StatsBar }           from './StatsBar'
import { BottomNav }          from './BottomNav'
import { Sidebar }            from './Sidebar'
import { PWAInstallBanner }   from '@/components/ui/PWAInstallBanner'
import { useBrainStore }      from '@/store/useBrainStore'
import { useSheetSync }       from '@/hooks/useSheetSync'
import { DEMO_ROWS }          from '@/data/demoData'
import { useConfettiCheck }   from '@/components/ui/Confetti'
import { useNotifications }   from '@/hooks/useNotifications'
import { onTokenReady } from '@/lib/gsi'
import { Sparkles, X, ChevronRight } from 'lucide-react'
import { monthDay, toLocalISODate } from '@/lib/date'

const CardView = lazy(() => import('@/components/views/CardView').then((m) => ({ default: m.CardView })))
const TableView = lazy(() => import('@/components/views/TableView').then((m) => ({ default: m.TableView })))
const TaskBoard = lazy(() => import('@/components/views/TaskBoard').then((m) => ({ default: m.TaskBoard })))
const GraphView = lazy(() => import('@/components/views/GraphView').then((m) => ({ default: m.GraphView })))
const DashboardView = lazy(() => import('@/components/views/DashboardView').then((m) => ({ default: m.DashboardView })))
const MemoryOSView = lazy(() => import('@/components/views/MemoryOSView').then((m) => ({ default: m.MemoryOSView })))
const DetailModal = lazy(() => import('@/components/modal/DetailModal').then((m) => ({ default: m.DetailModal })))
const NewRowModal = lazy(() => import('@/components/modal/NewRowModal').then((m) => ({ default: m.NewRowModal })))
const MilestoneModal = lazy(() => import('@/components/modal/MilestoneModal').then((m) => ({ default: m.MilestoneModal })))
const SettingsPanel = lazy(() => import('@/components/modal/SettingsPanel').then((m) => ({ default: m.SettingsPanel })))
const AIPanel = lazy(() => import('@/components/modal/AIPanel').then((m) => ({ default: m.AIPanel })))

function ShellFallback() {
  return (
    <div className="p-4 sm:p-5">
      <div className="h-28 rounded-xl border border-border bg-surface animate-pulse" />
    </div>
  )
}

function MilestoneBanner() {
  const specialDays          = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const [dismissed, setDismissed] = useState(false)

  const today   = toLocalISODate()
  const todayMD = monthDay(today)

  const todayMs       = specialDays.filter(d => d.date === today)
  const anniversaryMs = specialDays.filter(d => d.date !== today && d.date.slice(5) === todayMD)
  const allSpecial    = [...todayMs, ...anniversaryMs]

  if (dismissed || allSpecial.length === 0) return null

  const first  = allSpecial[0]
  const isAnni = first.date !== today && first.date.slice(5) === todayMD
  const extra  = allSpecial.length - 1

  return (
    <div className="relative overflow-hidden animate-slideDown sm:ml-14">
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 opacity-90" />
      <div className="milestone-shimmer absolute inset-0" />
      <div className="relative z-10 px-3 sm:px-4 py-2.5 flex items-center gap-3">
        <span className="text-xl shrink-0 select-none drop-shadow">{isAnni ? '🎂' : '🎉'}</span>
        <button onClick={() => setSelectedMilestone(first)}
          className="flex-1 flex items-center gap-2 text-left min-w-0">
          <div className="min-w-0">
            <span className="text-sm font-bold text-white drop-shadow-sm">
              {isAnni ? 'Anniversary: ' : 'Today: '}
              <span className="font-extrabold">{first.title}</span>
            </span>
            {extra > 0 && <span className="ml-2 text-xs text-white/70">+{extra} more</span>}
          </div>
          <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
        </button>
        <button onClick={() => setDismissed(true)}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}


export function AppShell() {
  const viewMode            = useBrainStore((s) => s.viewMode)
  const demoMode            = useBrainStore((s) => s.settings.demoMode)
  const setRows             = useBrainStore((s) => s.setRows)
  const selectedRow         = useBrainStore((s) => s.selectedRow)
  const showNewRow          = useBrainStore((s) => s.showNewRow)
  const setShowNewRow       = useBrainStore((s) => s.setShowNewRow)
  const showSettings        = useBrainStore((s) => s.showSettings)
  const showAIPanel         = useBrainStore((s) => s.showAIPanel)
  const selectionMode       = useBrainStore((s) => s.selectionMode)
  const selectedCardIndices = useBrainStore((s) => s.selectedCardIndices)
  const clearCardSelection  = useBrainStore((s) => s.clearCardSelection)
  const setShowAIPanel      = useBrainStore((s) => s.setShowAIPanel)
  const selectedMilestone   = useBrainStore((s) => s.selectedMilestone)
  const showNewMilestone    = useBrainStore((s) => s.showNewMilestone)
  const setShowNewMilestone = useBrainStore((s) => s.setShowNewMilestone)

  const { refresh, refreshConfig } = useSheetSync()
  const hasLoadedRef = useRef(false)

  useConfettiCheck()
  useNotifications()

  // Re-run config (milestones, categories, tags) once a token becomes available
  useEffect(() => {
    if (demoMode) return
    return onTokenReady(() => { refreshConfig().catch(() => {}) })
  }, [demoMode, refreshConfig])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const view   = params.get('view')
    if (action === 'new-entry')     setShowNewRow(true)
    if (action === 'new-milestone') setShowNewMilestone(true)
    if (view === 'board')           useBrainStore.getState().setViewMode('board')
    if (view === 'memory')          useBrainStore.getState().setViewMode('memory')
    if (action || view)             window.history.replaceState({}, '', window.location.pathname)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (demoMode) { setRows(DEMO_ROWS); hasLoadedRef.current = true; return }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      const t = setTimeout(() => { Promise.all([refresh(), refreshConfig()]).catch(() => {}) }, 100)
      return () => clearTimeout(t)
    }
  }, [demoMode, refresh, refreshConfig, setRows])

  useEffect(() => {
    const isDesktop = window.innerWidth >= 640
    const aiLocks   = showAIPanel && !isDesktop
    const locked    = !!(selectedRow || showNewRow || showSettings || aiLocks || selectedMilestone || showNewMilestone)
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedRow, showNewRow, showSettings, showAIPanel, selectedMilestone, showNewMilestone])

  return (
    <div className="app-safe-screen bg-bg">
      {/* Desktop nav rail */}
      <NavRail />

      {/* Sticky header */}
      <Header />

      {/* Announcement banner */}
      <PWAInstallBanner />
      <MilestoneBanner />

      {/* Filter / search bar — hidden on dashboard view */}
      {viewMode !== 'stats' && viewMode !== 'memory' && <FilterBar />}

      {/* Stats strip — hidden on dashboard view */}
      {viewMode !== 'stats' && viewMode !== 'memory' && (
        <div className="sm:ml-14">
          <StatsBar />
        </div>
      )}

      {/* Sidebar panel (overlay) */}
      <Sidebar />

      {/* Main content */}
      <main className="sm:ml-14 pb-20 sm:pb-8 min-h-[calc(100vh-200px)]">
        <Suspense fallback={<ShellFallback />}>
          {viewMode === 'card'  && <CardView />}
          {viewMode === 'table' && <TableView />}
          {viewMode === 'board' && <TaskBoard />}
          {viewMode === 'graph' && <GraphView />}
          {viewMode === 'stats' && <DashboardView />}
          {viewMode === 'memory' && <MemoryOSView />}
        </Suspense>
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50
          flex items-center gap-3
          bg-ink text-white rounded-2xl px-4 py-3 shadow-2xl
          animate-slideUp">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCardIndices.length} {selectedCardIndices.length === 1 ? 'card' : 'cards'} selected
          </span>
          {selectedCardIndices.length > 0 && (
            <button onClick={() => setShowAIPanel(true)}
              className="flex items-center gap-1.5 bg-brand text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand/90 transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
              Enhance selected
            </button>
          )}
          <button onClick={clearCardSelection}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Suspense fallback={null}>
        {selectedRow && <DetailModal />}
        {showNewRow && <NewRowModal />}
        {(selectedMilestone || showNewMilestone) && <MilestoneModal />}
        {showSettings && <SettingsPanel />}
        {showAIPanel && <AIPanel />}
      </Suspense>
    </div>
  )
}
