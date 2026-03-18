import { useMemo } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow } from '@/types/sheet'
import { parseTags } from '@/lib/utils'

export function useFilters() {
  const rows    = useBrainStore((s) => s.rows)
  const filters = useBrainStore((s) => s.filters)

  const filteredRows = useMemo<BrainRow[]>(() => {
    const today = new Date().toISOString().slice(0, 10)
    const q = (filters.search ?? '').toLowerCase()

    // Defensive guards: old persisted state may be missing fields added later
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

      // ── Categories (multi-select OR) ──────────────────────────────────
      if (categories.length > 0) {
        if (!categories.includes(r.category)) return false
      }

      // ── Sub-categories (multi-select OR) ─────────────────────────────
      if (subCategories.length > 0) {
        if (!subCategories.includes(r.subCategory)) return false
      }

      // ── Statuses (multi-select OR) ────────────────────────────────────
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

      // ── Tags (multi-select AND / OR based on tagMatchMode) ────────────
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

      // ── Persons (multi-select OR) ────────────────────────────────────
      if (persons.length > 0) {
        const rowPeople = (r.people ?? '').split(',').map((n) => n.trim().toLowerCase())
        const match = persons.some((p) => rowPeople.includes(p.toLowerCase()))
        if (!match) return false
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
    filters.dateTo
  )

  const activeFilterCount =
    (filters.categories    ?? []).length +
    (filters.subCategories ?? []).length +
    (filters.statuses      ?? []).length +
    (filters.persons       ?? []).length +
    (filters.selectedTags  ?? []).length +
    (filters.dateFrom || filters.dateTo ? 1 : 0)

  return { filteredRows, categories, subCategories, topTags, allPeople, hasActiveFilters, activeFilterCount }
}
