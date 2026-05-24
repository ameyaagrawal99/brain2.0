import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { parseTags, formatRelative } from '@/lib/utils'
import { coerceDate } from '@/lib/date'
import { useMemo } from 'react'

export function StatsBar() {
  const rows         = useBrainStore((s) => s.rows)
  const lastSyncedAt = useBrainStore((s) => s.lastSyncedAt)
  const { filteredRows } = useFilters()

  const stats = useMemo(() => {
    const done   = rows.filter((r) => { const s = r.taskStatus.toLowerCase(); return s.includes('done') || s.includes('complete') }).length
    const inProg = rows.filter((r) => { const s = r.taskStatus.toLowerCase(); return s.includes('progress') }).length
    const tagCount = new Set(rows.flatMap((r) => parseTags(r.tags))).size
    const completion = rows.filter(r => r.taskStatus).length > 0
      ? Math.round((done / rows.filter(r => r.taskStatus).length) * 100)
      : 0
    return { done, inProg, tagCount, completion }
  }, [rows])

  if (!rows.length) return null

  const isFiltered = rows.length !== filteredRows.length
  const syncedAt = coerceDate(lastSyncedAt)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-4 text-[11px] overflow-x-auto scrollbar-hide border-b border-border/50">

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-semibold text-ink2">
          {isFiltered ? (
            <><span className="text-brand">{filteredRows.length}</span> / {rows.length}</>
          ) : (
            <>{rows.length}</>
          )}
        </span>
        <span className="text-ink3">entries</span>
      </div>

      {stats.done > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-green-600 dark:text-green-400 font-medium">{stats.done} done</span>
        </div>
      )}

      {stats.inProg > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.inProg} active</span>
        </div>
      )}

      {stats.tagCount > 0 && (
        <span className="text-ink3 shrink-0">{stats.tagCount} tags</span>
      )}

      {stats.done > 0 && stats.completion > 0 && (
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-20 h-1 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion}%` }}
            />
          </div>
          <span className="text-ink3">{stats.completion}%</span>
        </div>
      )}

      {syncedAt && (
        <span className="ml-auto shrink-0 hidden sm:block text-ink3">
          synced {formatRelative(syncedAt.toISOString())}
        </span>
      )}
    </div>
  )
}
