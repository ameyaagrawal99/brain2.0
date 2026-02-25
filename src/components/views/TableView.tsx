import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useSheetSync } from '@/hooks/useSheetSync'
import { parseTags, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { BookOpen, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { stripMarkdown } from '@/lib/markdown'

function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

function cleanVal(v: string): string {
  return isFormula(v) ? '' : (v || '')
}

const STATUS_COLORS: Record<string, string> = {
  done:     'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
  progress: 'bg-blue-100 text-blue-700',
  pending:  'bg-amber-100 text-amber-700',
  blocked:  'bg-red-100 text-red-700',
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('complete')) return STATUS_COLORS.done
  if (s.includes('progress')) return STATUS_COLORS.progress
  if (s.includes('pending')) return STATUS_COLORS.pending
  if (s.includes('block')) return STATUS_COLORS.blocked
  return 'bg-surface2 text-ink2'
}

export function TableView() {
  const isSyncing = useBrainStore((s) => s.isSyncing)
  const rows      = useBrainStore((s) => s.rows)
  const demoMode  = useBrainStore((s) => s.settings.demoMode)
  const openModal = useBrainStore((s) => s.openModal)
  const { filteredRows } = useFilters()
  const { refresh } = useSheetSync()

  if (isSyncing && !rows.length) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 skeleton rounded-lg" />
        ))}
      </div>
    )
  }

  if (!rows.length && !isSyncing) {
    return (
      <EmptyState
        icon={BookOpen}
        title={demoMode ? 'No demo data' : 'No entries yet'}
        message="Add entries or sync from Google Sheets."
        action={!demoMode ? { label: 'Refresh', onClick: refresh } : undefined}
      />
    )
  }

  if (!filteredRows.length) {
    return (
      <EmptyState icon={Search} title="No results" message="Clear filters to see all entries." />
    )
  }

  return (
    <div className="overflow-x-auto px-3 sm:px-4 pb-6">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-8">#</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-1/4">Title</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-24">Category</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-24">Status</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3">Preview</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-28">Tags</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-ink3 w-24">Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => {
            const tags = parseTags(row.tags).slice(0, 2)
            const rawPreview = cleanVal(row.rewritten) || cleanVal(row.original) || ''
            const preview = stripMarkdown(rawPreview).slice(0, 120)
            const category   = cleanVal(row.category)
            const taskStatus = cleanVal(row.taskStatus)
            return (
              <tr
                key={row._rowIndex}
                onClick={() => openModal(row)}
                className={cn(
                  'border-b border-border cursor-pointer transition-colors',
                  i % 2 === 0 ? 'bg-surface' : 'bg-surface2/40',
                  'hover:bg-hover'
                )}
              >
                <td className="py-2.5 px-3 text-xs text-ink3">{row.srNo || i + 1}</td>
                <td className="py-2.5 px-3 max-w-0">
                  <div className="truncate font-medium text-ink text-xs">{row.title || 'Untitled'}</div>
                </td>
                <td className="py-2.5 px-3">
                  {category && (
                    <span className="inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-brand/8 text-brand truncate max-w-[80px]">
                      {category}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {taskStatus && (
                    <span className={cn('inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate max-w-[80px]', getStatusColor(taskStatus))}>
                      {taskStatus}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 max-w-0">
                  <div className="truncate text-xs text-ink2">{preview}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1 overflow-hidden">
                    {tags.map((t) => (
                      <span key={t} className="text-[10px] bg-brand/8 text-brand px-1.5 py-0.5 rounded-full truncate max-w-[60px]">#{t}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs text-ink3 whitespace-nowrap">
                  {formatDate(row.dueDate || row.createdAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
