import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { parseTags, formatRelative } from '@/lib/utils'
import { useMemo } from 'react'

export function StatsBar() {
  const rows         = useBrainStore((s) => s.rows)
  const lastSyncedAt = useBrainStore((s) => s.lastSyncedAt)
  const { filteredRows } = useFilters()

  const stats = useMemo(() => {
    const done   = rows.filter((r) => { const s = r.taskStatus.toLowerCase(); return s.includes('done') || s.includes('complete') }).length
    const inProg = rows.filter((r) => { const s = r.taskStatus.toLowerCase(); return s.includes('progress') }).length
    const tagCount = new Set(rows.flatMap((r) => parseTags(r.tags))).size
    return { done, inProg, tagCount }
  }, [rows])

  if (!rows.length) return null

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-3 sm:gap-5 text-xs text-ink3 overflow-x-auto scrollbar-hide">
      <span className="shrink-0">{rows.length} entries</span>
      {stats.done > 0 && <span className="text-green-500 shrink-0">{stats.done} done</span>}
      {stats.inProg > 0 && <span className="text-blue-500 shrink-0">{stats.inProg} active</span>}
      {stats.tagCount > 0 && <span className="shrink-0">{stats.tagCount} tags</span>}
      {rows.length !== filteredRows.length && (
        <span className="text-brand shrink-0">{filteredRows.length} shown</span>
      )}
      {lastSyncedAt && (
        <span className="ml-auto shrink-0 hidden sm:block">synced {formatRelative(lastSyncedAt.toISOString())}</span>
      )}
    </div>
  )
}
