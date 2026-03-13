import { useEffect, useRef } from 'react'
import { Header }        from './Header'
import { FilterBar }     from './FilterBar'
import { StatsBar }      from './StatsBar'
import { BottomNav }     from './BottomNav'
import { Sidebar }       from './Sidebar'
import { CardView }      from '@/components/views/CardView'
import { TableView }     from '@/components/views/TableView'
import { TaskBoard }     from '@/components/views/TaskBoard'
import { DetailModal }   from '@/components/modal/DetailModal'
import { NewRowModal }   from '@/components/modal/NewRowModal'
import { SettingsPanel } from '@/components/modal/SettingsPanel'
import { AIPanel }       from '@/components/modal/AIPanel'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync }  from '@/hooks/useSheetSync'
import { DEMO_ROWS }     from '@/data/demoData'
import { useConfettiCheck } from '@/components/ui/Confetti'
import { Sparkles, X } from 'lucide-react'

export function AppShell() {
  const viewMode            = useBrainStore((s) => s.viewMode)
  const demoMode            = useBrainStore((s) => s.settings.demoMode)
  const setRows             = useBrainStore((s) => s.setRows)
  const selectedRow         = useBrainStore((s) => s.selectedRow)
  const showNewRow          = useBrainStore((s) => s.showNewRow)
  const showSettings        = useBrainStore((s) => s.showSettings)
  const showAIPanel         = useBrainStore((s) => s.showAIPanel)
  const selectionMode       = useBrainStore((s) => s.selectionMode)
  const selectedCardIndices = useBrainStore((s) => s.selectedCardIndices)
  const clearCardSelection  = useBrainStore((s) => s.clearCardSelection)
  const setShowAIPanel      = useBrainStore((s) => s.setShowAIPanel)

  const { refresh, refreshConfig } = useSheetSync()
  const hasLoadedRef = useRef(false)

  useConfettiCheck()

  useEffect(() => {
    if (demoMode) {
      setRows(DEMO_ROWS)
      hasLoadedRef.current = true
      return
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      const t = setTimeout(() => {
        // Run data fetch and config fetch in parallel
        Promise.all([refresh(), refreshConfig()]).catch(() => {})
      }, 100)
      return () => clearTimeout(t)
    }
  }, [demoMode, refresh, refreshConfig, setRows])

  // Lock body scroll when any modal is open
  // AI panel on desktop (sm+) is a drawer — don't lock scroll
  useEffect(() => {
    const isDesktop = window.innerWidth >= 640
    const aiLocks   = showAIPanel && !isDesktop
    const locked    = !!(selectedRow || showNewRow || showSettings || aiLocks)
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedRow, showNewRow, showSettings, showAIPanel])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <FilterBar />
      <StatsBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 w-full max-w-7xl mx-auto overflow-x-auto pb-16 sm:pb-0 min-w-0">
          {viewMode === 'card'  && <CardView />}
          {viewMode === 'table' && <TableView />}
          {viewMode === 'board' && <TaskBoard />}
        </main>
      </div>
      <BottomNav />

      {/* Selection mode floating action bar */}
      {selectionMode && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-ink text-white rounded-2xl px-4 py-3 shadow-2xl">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCardIndices.length} {selectedCardIndices.length === 1 ? 'card' : 'cards'} selected
          </span>
          {selectedCardIndices.length > 0 && (
            <button
              onClick={() => { setShowAIPanel(true) }}
              className="flex items-center gap-1.5 bg-brand text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand/90 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Enhance selected
            </button>
          )}
          <button
            onClick={clearCardSelection}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Exit selection mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <DetailModal />
      <NewRowModal />
      <SettingsPanel />
      <AIPanel />
    </div>
  )
}
