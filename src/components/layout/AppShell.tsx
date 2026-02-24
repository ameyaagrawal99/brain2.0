import { useEffect, useRef } from 'react'
import { Header }        from './Header'
import { FilterBar }     from './FilterBar'
import { StatsBar }      from './StatsBar'
import { BottomNav }     from './BottomNav'
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

export function AppShell() {
  const viewMode     = useBrainStore((s) => s.viewMode)
  const demoMode     = useBrainStore((s) => s.settings.demoMode)
  const setRows      = useBrainStore((s) => s.setRows)
  const selectedRow  = useBrainStore((s) => s.selectedRow)
  const showNewRow   = useBrainStore((s) => s.showNewRow)
  const showSettings = useBrainStore((s) => s.showSettings)
  const showAIPanel  = useBrainStore((s) => s.showAIPanel)

  const { refresh, refreshConfig } = useSheetSync()
  const hasLoadedRef = useRef(false)

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
      <main className="flex-1 w-full max-w-7xl mx-auto overflow-x-auto pb-16 sm:pb-0">
        {viewMode === 'card'  && <CardView />}
        {viewMode === 'table' && <TableView />}
        {viewMode === 'board' && <TaskBoard />}
      </main>
      <BottomNav />
      <DetailModal />
      <NewRowModal />
      <SettingsPanel />
      <AIPanel />
    </div>
  )
}
