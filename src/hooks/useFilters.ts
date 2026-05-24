import { useMemo } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags } from '@/lib/utils'
import { analyzeSentiment } from '@/lib/sentiment'
import { toLocalISODate } from '@/lib/date'

export function useFilters() {
  const rows            = useBrainStore((s) => s.rows)
  const filters         = useBrainStore((s) => s.filters)
  const sentimentFilter = useBrainStore((s) => s.sentimentFilter)

  // Compute per-row sentiment lazily — only when a sentiment filter is active
  const sentimentMap = useMemo(() => {
    if (!sentimentFilter) return null
    const map = new Map<number, ReturnType<typeof analyzeSentiment>>()
    for (const row of rows) {
      const text = [row.title, row.original, row.rewritten, row.actionItems].filter(Boolean).join(' ')
      map.set(row._rowIndex, analyzeSentiment(text))
    }
    return map
  }, [rows, sentimentFilter])

  const filteredRows = useMemo<BrainRow[]>(() => {
    const today = toLocalISODate()
    const q = (filters.search ?? '').toLowerCase()

    const categories    = filters.categories    ?? []
    const subCategories = filters.subCategories ?? []
    const statuses      = filters.statuses      ?? []
    const selectedTags  = filters.selectedTags  ?? []
    const persons       = filters.persons       ?? []
    const tagMatchMode  = filters.tagMatchMode  ?? 'and'

    let result = rows.filter((r) => {
      // ── Full-text search ─────────────────────────────────────────────
      if (q) {
        const hay = [r.title, r.original, r.rewritten, r.actionItems, r.tags, r.category, r.subCategory, r.people]
          .join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }

      // ── Categories ───────────────────────────────────────────────────
      if (categories.length > 0) {
        if (!categories.includes(r.category)) return false
      }

      // ── Sub-categories ───────────────────────────────────────────────
      if (subCategories.length > 0) {
        if (!subCategories.includes(r.subCategory)) return false
      }

      // ── Statuses ─────────────────────────────────────────────────────
      if (statuses.length > 0) {
        const s = (r.taskStatus ?? '').toLowerCase()
        const match = statuses.some((status) => {
          if (status === 'done')     return s.includes('done') || s.includes('complete')
          if (status === 'progress') return s.includes('progress') || s.includes('doing')
          if (status === 'pending')  return !s.includes('done') && !s.includes('complete') && !s.includes('progress') && !s.includes('doing')
          if (status === 'blocked')  return s.includes('block')
          if (status === 'review')   return s.includes('review')
          return false
        })
        if (!match) return false
      }

      // ── Tags ─────────────────────────────────────────────────────────
      if (selectedTags.length > 0) {
        const rowTags = parseTags(r.tags)
        if (tagMatchMode === 'and') {
          for (const t of selectedTags) {
            if (!rowTags.includes(t)) return false
          }
        } else {
          if (!selectedTags.some((t) => rowTags.includes(t))) return false
        }
      }

      // ── Date range ───────────────────────────────────────────────────
      if (filters.dateFrom || filters.dateTo) {
        const rowDate = r.createdAt?.slice(0, 10) ?? ''
        if (!rowDate) return false
        if (filters.dateFrom && rowDate < filters.dateFrom) return false
        if (filters.dateTo   && rowDate > filters.dateTo)   return false
      } else if (filters.showToday) {
        const createdToday = r.createdAt?.startsWith(today)
        const dueToday     = r.dueDate?.trim() === today
        if (!createdToday && !dueToday) return false
      }

      // ── Persons ──────────────────────────────────────────────────────
      if (persons.length > 0) {
        const rowPeople = (r.people ?? '').split(',').map((n) => n.trim().toLowerCase())
        const match = persons.some((p) => rowPeople.includes(p.toLowerCase()))
        if (!match) return false
      }

      // ── Sentiment filter ─────────────────────────────────────────────
      if (sentimentFilter && sentimentMap) {
        const s = sentimentMap.get(r._rowIndex)
        if (!s) return false
        if (sentimentFilter.kind === 'tone') {
          if (s.label !== sentimentFilter.value) return false
        } else {
          // emotion: keep rows where that emotion has the highest count (dominant)
          // OR at least has some signal above zero
          const target = s.emotions[sentimentFilter.value] ?? 0
          if (target === 0) return false
          // Require it to be among the top 2 emotions for this row
          const sorted = Object.values(s.emotions).sort((a, b) => b - a)
          const threshold = sorted[1] ?? 0
          if (target < threshold) return false
        }
      }

      return true
    })

    // Sort
    if (filters.sortBy === 'date-desc' || filters.sortBy === 'date-asc') {
      const ts = new Map(result.map((r) => [r._rowIndex, r.createdAt ? new Date(r.createdAt).getTime() : 0]))
      result = [...result].sort((a, b) =>
        filters.sortBy === 'date-desc'
          ? (ts.get(b._rowIndex) ?? 0) - (ts.get(a._rowIndex) ?? 0)
          : (ts.get(a._rowIndex) ?? 0) - (ts.get(b._rowIndex) ?? 0)
      )
    } else if (filters.sortBy === 'num-asc' || filters.sortBy === 'num-desc') {
      const ns = new Map(result.map((r) => [r._rowIndex, parseFloat(r.srNo || '0')]))
      result = [...result].sort((a, b) =>
        filters.sortBy === 'num-asc'
          ? (ns.get(a._rowIndex) ?? 0) - (ns.get(b._rowIndex) ?? 0)
          : (ns.get(b._rowIndex) ?? 0) - (ns.get(a._rowIndex) ?? 0)
      )
    } else {
      result = [...result].sort((a, b) => {
        if (filters.sortBy === 'title-asc') return a.title.localeCompare(b.title)
        if (filters.sortBy === 'cat-asc')   return a.category.localeCompare(b.category)
        return 0
      })
    }
    return result
  }, [rows, filters, sentimentFilter, sentimentMap])

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
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t)
  }, [rows])

  const allPeople = useMemo(() => {
    const freq: Record<string, number> = {}
    rows.forEach((r) => {
      (r.people ?? '').split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => {
        freq[n] = (freq[n] || 0) + 1
      })
    })
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [rows])

  const hasActiveFilters = !!(
    filters.search ||
    (filters.categories    ?? []).length > 0 ||
    (filters.subCategories ?? []).length > 0 ||
    (filters.statuses      ?? []).length > 0 ||
    (filters.persons       ?? []).length > 0 ||
    (filters.selectedTags  ?? []).length > 0 ||
    filters.showToday ||
    filters.dateFrom ||
    filters.dateTo ||
    sentimentFilter
  )

  const activeFilterCount =
    (filters.categories    ?? []).length +
    (filters.subCategories ?? []).length +
    (filters.statuses      ?? []).length +
    (filters.persons       ?? []).length +
    (filters.selectedTags  ?? []).length +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (sentimentFilter ? 1 : 0)

  return { filteredRows, categories, subCategories, topTags, allPeople, hasActiveFilters, activeFilterCount }
}
