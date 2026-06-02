import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useFilters } from '@/hooks/useFilters'
import { BrainRow } from '@/types/sheet'
import { parseTags, formatDate, getStatusDot, statusColor, categoryColor, isImageUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getTaskDueLane, getTaskMetadata } from '@/lib/taskMetadata'
import type { DueLane } from '@/lib/taskMetadata'
import { AlertTriangle, Calendar, ChevronDown, Flag, GripVertical, ListChecks, Repeat, Tag } from 'lucide-react'

const COLUMNS = ['Pending', 'In Progress', 'In Review', 'Done', 'Blocked'] as const
const DUE_COLUMNS = ['Overdue', 'Today', 'Upcoming', 'No due date', 'Done'] as const
const COLUMN_ACCENT: Record<string, string> = {
  'Pending':     'border-amber-300  dark:border-amber-700',
  'In Progress': 'border-blue-300   dark:border-blue-700',
  'In Review':   'border-purple-300 dark:border-purple-700',
  'Done':        'border-green-300  dark:border-green-700',
  'Blocked':     'border-red-300    dark:border-red-700',
  'Unassigned':  'border-border',
  'Overdue':     'border-red-300    dark:border-red-700',
  'Today':       'border-brand/60',
  'Upcoming':    'border-blue-300   dark:border-blue-700',
  'No due date': 'border-border',
}

const STATUS_OPTIONS = ['Pending', 'In Progress', 'In Review', 'Done', 'Blocked']
type BoardMode = 'status' | 'due'

export function TaskBoard() {
  const { filteredRows } = useFilters()
  const openModal = useBrainStore((s) => s.openModal)
  const { saveRow } = useSheetSync()
  const [mode, setMode] = useState<BoardMode>('status')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const statusGrouped = useMemo(() => {
    const map: Record<string, BrainRow[]> = {}
    ;[...COLUMNS, 'Unassigned'].forEach((c) => { map[c] = [] })
    filteredRows.forEach((r) => {
      const status = r.taskStatus?.trim()
      const match = COLUMNS.find((c) => c.toLowerCase() === status?.toLowerCase())
      if (match) map[match].push(r)
      else map['Unassigned'].push(r)
    })
    return map
  }, [filteredRows])

  const dueGrouped = useMemo(() => {
    const map: Record<DueLane, BrainRow[]> = {
      'Overdue': [],
      'Today': [],
      'Upcoming': [],
      'No due date': [],
      'Done': [],
    }
    filteredRows.forEach((row) => {
      map[getTaskDueLane(row)].push(row)
    })
    return map
  }, [filteredRows])

  const statusColumns = [...COLUMNS, ...(statusGrouped['Unassigned'].length > 0 ? ['Unassigned'] : [])]
  const visibleColumns = mode === 'status' ? statusColumns : DUE_COLUMNS
  const grouped: Record<string, BrainRow[]> = mode === 'status' ? statusGrouped : dueGrouped

  function handleDragEnd(event: DragEndEvent) {
    if (mode !== 'status') return
    const rowIndex = Number(event.active.id)
    const nextStatus = String(event.over?.id ?? '')
    if (!rowIndex || !STATUS_OPTIONS.includes(nextStatus)) return

    const row = filteredRows.find((r) => r._rowIndex === rowIndex)
    if (!row || (row.taskStatus ?? 'Pending').toLowerCase() === nextStatus.toLowerCase()) return
    void saveRow(row._rowIndex, { taskStatus: nextStatus }, 'Kanban status')
  }

  return (
    <div className="min-h-[60vh] pb-24 sm:pb-4">
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="inline-flex rounded-lg border border-border bg-surface2 p-1">
          {[
            { key: 'status' as BoardMode, label: 'Status' },
            { key: 'due' as BoardMode, label: 'Due date' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                mode === item.key ? 'bg-surface text-ink shadow-sm' : 'text-ink3 hover:text-ink'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="hidden sm:block text-xs text-ink3">
          {mode === 'status' ? 'Drag cards between columns to persist status.' : 'Tasks grouped by due date without changing dates.'}
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 p-3 sm:p-4 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {visibleColumns.map((col) => (
            <KanbanColumn
              key={col}
              title={col}
              rows={grouped[col] ?? []}
              accentClass={COLUMN_ACCENT[col] ?? 'border-border'}
              draggable={mode === 'status' && col !== 'Unassigned'}
              droppable={mode === 'status' && col !== 'Unassigned'}
              onCardClick={openModal}
              onStatusChange={(row, newStatus) => saveRow(row._rowIndex, { taskStatus: newStatus }, 'Kanban status')}
            />
          ))}
          {filteredRows.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-ink3 text-sm">
              No entries match your filters.
            </div>
          )}
        </div>
      </DndContext>
    </div>
  )
}

function KanbanColumn({
  title, rows, accentClass, draggable, droppable, onCardClick, onStatusChange,
}: {
  title: string
  rows: BrainRow[]
  accentClass: string
  draggable: boolean
  droppable: boolean
  onCardClick: (row: BrainRow) => void
  onStatusChange: (row: BrainRow, status: string) => void
}) {
  const dot = getStatusDot(title)
  const { setNodeRef, isOver } = useDroppable({ id: title, disabled: !droppable })

  return (
    <div ref={setNodeRef} className={cn(
      'flex flex-col shrink-0 w-72 bg-surface2 rounded-xl border-t-2 border-x border-b border-border transition-colors',
      accentClass,
      isOver && 'bg-brand/5 ring-2 ring-brand/30',
    )}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
        <span className="text-xs font-semibold text-ink flex-1">{title}</span>
        <span className="text-[10px] text-ink3 bg-surface rounded-full px-1.5 py-0.5 font-medium">
          {rows.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {rows.length === 0 && (
          <p className="text-center text-xs text-ink3 py-6 italic">No items</p>
        )}
        {rows.map((row) => (
          <KanbanCard
            key={row._rowIndex}
            row={row}
            draggable={draggable}
            onClick={() => onCardClick(row)}
            onStatusChange={(s) => onStatusChange(row, s)}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanCard({
  row, draggable, onClick, onStatusChange,
}: {
  row: BrainRow
  draggable: boolean
  onClick: () => void
  onStatusChange: (status: string) => void
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(row._rowIndex),
    disabled: !draggable,
  })
  const tags = parseTags(row.tags).slice(0, 2)
  const meta = getTaskMetadata(row)
  const firstAction = row.actionItems
    ?.split('\n')
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .find((l) => l.length > 0)
  const hasImage = row.mediaUrl && isImageUrl(row.mediaUrl)
  const catClass = categoryColor(row.category)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-surface rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group',
        isDragging && 'opacity-60 shadow-lg ring-2 ring-brand/30'
      )}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      onClick={onClick}
    >
      {/* Image thumbnail */}
      {hasImage && (
        <div className="w-full h-24 overflow-hidden bg-surface2">
          <img
            src={row.mediaUrl}
            alt={row.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          {draggable && (
            <button
              type="button"
              className="text-ink3 hover:text-ink cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
              title="Drag to change status"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          {row.category && (
            <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded', catClass)}>
              {row.category}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{row.title || 'Untitled'}</p>

        {/* First action item */}
        {firstAction && (
          <div className="flex items-start gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-brand/10 text-brand text-[9px] flex items-center justify-center shrink-0 mt-0.5">→</span>
            <span className="text-xs text-ink2 line-clamp-1">{firstAction}</span>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-0.5 text-[10px] text-ink3">
                <Tag className="w-2.5 h-2.5" />#{t}
              </span>
            ))}
          </div>
        )}

        {(meta.priority || meta.blocked || meta.recurring || meta.subtasksTotal > 0) && (
          <div className="flex gap-1 flex-wrap">
            {meta.priority && (
              <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border', meta.priorityClass)} title={`${meta.priority} priority`}>
                <Flag className="w-2.5 h-2.5" />{meta.priority}
              </span>
            )}
            {meta.blocked && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" title={meta.blockerText || 'Blocked'}>
                <AlertTriangle className="w-2.5 h-2.5" />Blocked
              </span>
            )}
            {meta.recurring && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" title="Recurring task">
                <Repeat className="w-2.5 h-2.5" />{meta.recurrence}
              </span>
            )}
            {meta.subtasksTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface2 text-ink3" title="Subtasks">
                <ListChecks className="w-2.5 h-2.5" />{meta.subtasksDone}/{meta.subtasksTotal}
              </span>
            )}
          </div>
        )}

        {/* Footer: due date + quick status */}
        <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
          {row.dueDate ? (
            <span className="flex items-center gap-1 text-[10px] text-ink3">
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(row.dueDate)}
            </span>
          ) : <span />}

          {/* Quick status dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatusMenu(!showStatusMenu) }}
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors',
                statusColor(row.taskStatus || 'Pending')
              )}
            >
              {row.taskStatus || 'Pending'}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 bottom-full mb-1 z-10 bg-surface border border-border rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(s)
                      setShowStatusMenu(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-hover transition-colors',
                      row.taskStatus?.toLowerCase() === s.toLowerCase() ? 'font-medium text-brand' : 'text-ink'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
