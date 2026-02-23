import { useEffect } from 'react'
import { Header }       from './Header'
import { FilterBar }    from './FilterBar'
import { StatsBar }     from './StatsBar'
import { CardView }     from '@/components/views/CardView'
import { TableView }    from '@/components/views/TableView'
import { DetailModal }  from '@/components/modal/DetailModal'
import { NewEntryModal } from '@/components/modal/NewEntryModal'
import { SettingsPanel } from '@/components/modal/SettingsPanel'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync }  from '@/hooks/useSheetSync'
import { DEMO_ROWS }     from '@/data/demoData'

export function AppShell() {
  const viewMode   = useBrainStore((s) => s.viewMode)
  const demoMode   = useBrainStore((s) => s.settings.demoMode)
  const setRows    = useBrainStore((s) => s.setRows)
  const rows       = useBrainStore((s) => s.rows)
  const { refresh } = useSheetSync()

  useEffect(() => {
    if (demoMode) {
      setRows(DEMO_ROWS)
    } else if (!rows.length) {
      refresh()
    }
  }, [demoMode])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <FilterBar />
      <StatsBar />
      <main className="flex-1 max-w-7xl w-full mx-auto">
        {viewMode === 'card' ? <CardView /> : <TableView />}
      </main>
      <DetailModal />
      <NewEntryModal />
      <SettingsPanel />
    </div>
  )
}
