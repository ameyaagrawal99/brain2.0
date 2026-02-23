import { useSortable } from '@dnd-kit/sortable'
import { CSS }         from '@dnd-kit/utilities'
import { BrainRow }    from '@/types/sheet'
import { BrainCard }   from './BrainCard'

export function SortableCard({ row }: { row: BrainRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._rowIndex })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? 'relative' : undefined,
      }}
    >
      <BrainCard
        row={row}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  )
}
