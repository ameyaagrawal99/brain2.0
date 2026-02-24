import { useMemo } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags } from '@/lib/utils'

export function useFilters() {
  const rows    = useBrainStore((s) => s.rows)
  const filters = useBrainStore((s) => s.filters)

  const filteredRows = useMemo<BrainRow[]>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const q = filters.search.toLowerCase()

    let result = rows.filter((r) => {
      if (q) {
        const hay = [r.title, r.original, r.rewritten, r.actionItems, r.tags, r.category, r.subCategory]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.category && r.category !== filters.category) return false
      if (filters.subCategory && r.subCategory !== filters.subCategory) return false
      if (filters.status) {
        const s = r.taskStatus.toLowerCase()
        if (filters.status === 'done'     && !s.includes('done') && !s.includes('complete')) return false
        if (filters.status === 'progress' && !s.includes('progress') && !s.includes('doing')) return false
        if (filters.status === 'pending'  &&
          (s.includes('done') || s.includes('complete') || s.includes('progress') || s.includes('doing'))) return false
      }
      if (filters.selectedTags.length > 0) {
        const rowTags = parseTags(r.tags)
        for (const t of filters.selectedTags) {
          if (!rowTags.includes(t)) return false
        }
      }
      if (filters.showToday) {
        const createdToday = r.createdAt?.startsWith(today)
        const dueToday     = r.dueDate?.trim() === today
        if (!createdToday && !dueToday) return false
      }
      return true
    })

    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        case 'date-asc':  return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        case 'title-asc': return a.title.localeCompare(b.title)
        case 'cat-asc':   return a.category.localeCompare(b.category)
        case 'num-asc':   return parseFloat(a.srNo || '0') - parseFloat(b.srNo || '0')
        case 'num-desc':  return parseFloat(b.srNo || '0') - parseFloat(a.srNo || '0')
        default: return 0
      }
    })
    return result
  }, [rows, filters])

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  )
  const subCategories = useMemo(
    () => [...new Set(rows.map((r) => r.subCategory).filter(Boolean))].sort(),
    [rows],
  )
  const topTags = useMemo(() => {
    const freq: Record<string, number> = {}
    rows.forEach((r) => parseTags(r.tags).forEach((t) => { freq[t] = (freq[t] || 0) + 1 }))
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([t]) => t)
  }, [rows])

  const hasActiveFilters = !!(
    filters.search || filters.category || filters.subCategory ||
    filters.status || filters.selectedTags.length > 0 || filters.showToday
  )

  return { filteredRows, categories, subCategories, topTags, hasActiveFilters }
}
