import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters }    from '@/hooks/useFilters'
import { SortableCard }  from './SortableCard'
import { CardSkeleton }  from '@/components/ui/Skeleton'
import { EmptyState }    from '@/components/ui/EmptyState'
import { Search, BookOpen } from 'lucide-react'

export function CardView() {
  const isSyncing   = useBrainStore((s) => s.isSyncing)
  const rows        = useBrainStore((s) => s.rows)
  const reorderRows = useBrainStore((s) => s.reorderRows)
  const { filteredRows, hasActiveFilters } = useFilters()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const fromIdx = rows.findIndex((r) => r._rowIndex === active.id)
    const toIdx   = rows.findIndex((r) => r._rowIndex === over.id)
    if (fromIdx !== -1 && toIdx !== -1) reorderRows(fromIdx, toIdx)
  }

  // Loading skeleton
  if (isSyncing && !rows.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No entries yet"
        message="Your Google Sheet is empty or hasn't synced yet. Click the refresh button to load your data."
      />
    )
  }

  if (!filteredRows.length) {
    return (
      <EmptyState
        icon={Search}
        title="No results"
        message="No entries match your filters. Try clearing some filters or searching for something else."
      />
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredRows.map((r) => r._rowIndex)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 stagger">
          {filteredRows.map((row) => (
            <SortableCard key={row._rowIndex} row={row} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
