import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters }    from '@/hooks/useFilters'
import { useSheetSync }  from '@/hooks/useSheetSync'
import { SortableCard }  from './SortableCard'
import { CardSkeleton }  from '@/components/ui/Skeleton'
import { EmptyState }    from '@/components/ui/EmptyState'
import { Search, BookOpen } from 'lucide-react'

export function CardView() {
  const isSyncing   = useBrainStore((s) => s.isSyncing)
  const rows        = useBrainStore((s) => s.rows)
  const demoMode    = useBrainStore((s) => s.settings.demoMode)
  const reorderRows = useBrainStore((s) => s.reorderRows)
  const { filteredRows, hasActiveFilters } = useFilters()
  const { refresh } = useSheetSync()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = rows.findIndex((r) => r._rowIndex === active.id)
    const toIdx   = rows.findIndex((r) => r._rowIndex === over.id)
    if (fromIdx !== -1 && toIdx !== -1) reorderRows(fromIdx, toIdx)
  }

  if (isSyncing && !rows.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 sm:p-4">
        {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (!rows.length && !isSyncing) {
    return (
      <EmptyState
        icon={BookOpen}
        title={demoMode ? 'No demo data' : 'No entries yet'}
        message={
          demoMode
            ? 'Enable demo mode in Settings to see sample data.'
            : 'Your entries will appear here. Click Refresh to sync from Google Sheets, or add a new entry.'
        }
        action={!demoMode ? { label: 'Refresh now', onClick: refresh } : undefined}
      />
    )
  }

  if (!filteredRows.length) {
    return (
      <EmptyState
        icon={Search}
        title="No results"
        message="No entries match your filters. Try clearing some filters."
      />
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredRows.map((r) => r._rowIndex)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 sm:p-4 stagger">
          {filteredRows.map((row) => (
            <SortableCard key={row._rowIndex} row={row} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
