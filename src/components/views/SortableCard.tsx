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
        dragHandle={
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-ink3 hover:text-ink2 touch-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <circle cx="5" cy="4" r="1.2" fill="currentColor" />
              <circle cx="11" cy="4" r="1.2" fill="currentColor" />
              <circle cx="5" cy="8" r="1.2" fill="currentColor" />
              <circle cx="11" cy="8" r="1.2" fill="currentColor" />
              <circle cx="5" cy="12" r="1.2" fill="currentColor" />
              <circle cx="11" cy="12" r="1.2" fill="currentColor" />
            </svg>
          </div>
        }
      />
    </div>
  )
}
