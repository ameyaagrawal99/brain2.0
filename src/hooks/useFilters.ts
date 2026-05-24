import { useMemo } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { parseTags } from '@/lib/utils'
import { filterAndSortRows } from '@/lib/filterRows'

export function useFilters() {
  const rows            = useBrainStore((s) => s.rows)
  const filters         = useBrainStore((s) => s.filters)
  const sentimentFilter = useBrainStore((s) => s.sentimentFilter)

  const filteredRows = useMemo(() => filterAndSortRows(rows, filters, sentimentFilter), [rows, filters, sentimentFilter])

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
