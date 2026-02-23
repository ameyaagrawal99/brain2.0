import { useEffect, useRef } from 'react'
import { Header }        from './Header'
import { FilterBar }     from './FilterBar'
import { StatsBar }      from './StatsBar'
import { CardView }      from '@/components/views/CardView'
import { TableView }     from '@/components/views/TableView'
import { DetailModal }   from '@/components/modal/DetailModal'
import { NewRowModal }   from '@/components/modal/NewRowModal'
import { SettingsPanel } from '@/components/modal/SettingsPanel'
import { AIPanel }       from '@/components/modal/AIPanel'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync }  from '@/hooks/useSheetSync'
import { DEMO_ROWS }     from '@/data/demoData'

export function AppShell() {
  const viewMode    = useBrainStore((s) => s.viewMode)
  const demoMode    = useBrainStore((s) => s.settings.demoMode)
  const setRows     = useBrainStore((s) => s.setRows)
  const selectedRow = useBrainStore((s) => s.selectedRow)
  const showNewRow  = useBrainStore((s) => s.showNewRow)
  const showSettings= useBrainStore((s) => s.showSettings)
  const showAIPanel = useBrainStore((s) => s.showAIPanel)
  const { refresh } = useSheetSync()

  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (demoMode) {
      setRows(DEMO_ROWS)
      hasLoadedRef.current = true
      return
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      const t = setTimeout(() => { refresh() }, 100)
      return () => clearTimeout(t)
    }
  }, [demoMode, refresh, setRows])

  // Lock body scroll when any overlay is open
  useEffect(() => {
    const locked = !!(selectedRow || showNewRow || showSettings || showAIPanel)
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedRow, showNewRow, showSettings, showAIPanel])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <FilterBar />
      <StatsBar />
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {viewMode === 'card' ? <CardView /> : <TableView />}
      </main>
      <DetailModal />
      <NewRowModal />
      <SettingsPanel />
      <AIPanel />
    </div>
  )
}
