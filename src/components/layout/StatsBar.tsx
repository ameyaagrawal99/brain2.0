import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { parseTags, formatRelative } from '@/lib/utils'
import { useMemo } from 'react'

export function StatsBar() {
  const rows        = useBrainStore((s) => s.rows)
  const lastSyncedAt= useBrainStore((s) => s.lastSyncedAt)
  const { filteredRows } = useFilters()

  const stats = useMemo(() => {
    const done     = rows.filter((r) => {
      const s = r.taskStatus.toLowerCase()
      return s.includes('done') || s.includes('complete')
    }).length
    const inProg   = rows.filter((r) => {
      const s = r.taskStatus.toLowerCase()
      return s.includes('progress') || s.includes('doing')
    }).length
    const tagCount = new Set(rows.flatMap((r) => parseTags(r.tags))).size
    return { done, inProg, tagCount }
  }, [rows])

  if (!rows.length) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink3">
      <span>{rows.length} total</span>
      <span className="text-ok">{stats.done} done</span>
      <span className="text-info">{stats.inProg} in progress</span>
      <span>{stats.tagCount} tags</span>
      {rows.length !== filteredRows.length && (
        <span className="text-brand">{filteredRows.length} shown</span>
      )}
      {lastSyncedAt && (
        <span className="ml-auto">synced {formatRelative(lastSyncedAt.toISOString())}</span>
      )}
    </div>
  )
}
