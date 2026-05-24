import type { BrainRow, SortKey } from '../types/sheet.ts'
import { parseTags } from './utils.ts'
import { analyzeSentiment, type SentimentFilter } from './sentiment.ts'
import { toLocalISODate } from './date.ts'

export interface FilterStateLike {
  search?: string
  categories?: string[]
  subCategories?: string[]
  statuses?: string[]
  persons?: string[]
  selectedTags?: string[]
  tagMatchMode?: 'and' | 'or'
  sortBy?: SortKey
  showToday?: boolean
  dateFrom?: string | null
  dateTo?: string | null
}

export function rowMatchesFilters(
  row: BrainRow,
  filters: FilterStateLike,
  sentimentFilter: SentimentFilter | null,
  today = toLocalISODate(),
) {
  const q = (filters.search ?? '').toLowerCase()
  const categories = filters.categories ?? []
  const subCategories = filters.subCategories ?? []
  const statuses = filters.statuses ?? []
  const selectedTags = filters.selectedTags ?? []
  const persons = filters.persons ?? []
  const tagMatchMode = filters.tagMatchMode ?? 'and'

  if (q) {
    const hay = [row.title, row.original, row.rewritten, row.actionItems, row.tags, row.category, row.subCategory, row.people]
      .join(' ').toLowerCase()
    if (!hay.includes(q)) return false
  }

  if (categories.length > 0 && !categories.includes(row.category)) return false
  if (subCategories.length > 0 && !subCategories.includes(row.subCategory)) return false

  if (statuses.length > 0) {
    const statusText = (row.taskStatus ?? '').toLowerCase()
    const match = statuses.some((status) => {
      if (status === 'done') return statusText.includes('done') || statusText.includes('complete')
      if (status === 'progress') return statusText.includes('progress') || statusText.includes('doing')
      if (status === 'pending') return !statusText.includes('done') && !statusText.includes('complete') && !statusText.includes('progress') && !statusText.includes('doing')
      if (status === 'blocked') return statusText.includes('block')
      if (status === 'review') return statusText.includes('review')
      return false
    })
    if (!match) return false
  }

  if (selectedTags.length > 0) {
    const rowTags = parseTags(row.tags)
    if (tagMatchMode === 'and') {
      if (selectedTags.some((tag) => !rowTags.includes(tag))) return false
    } else if (!selectedTags.some((tag) => rowTags.includes(tag))) {
      return false
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    const rowDate = row.createdAt?.slice(0, 10) ?? ''
    if (!rowDate) return false
    if (filters.dateFrom && rowDate < filters.dateFrom) return false
    if (filters.dateTo && rowDate > filters.dateTo) return false
  } else if (filters.showToday) {
    const createdToday = row.createdAt?.startsWith(today)
    const dueToday = row.dueDate?.trim() === today
    if (!createdToday && !dueToday) return false
  }

  if (persons.length > 0) {
    const rowPeople = (row.people ?? '').split(',').map((name) => name.trim().toLowerCase())
    if (!persons.some((person) => rowPeople.includes(person.toLowerCase()))) return false
  }

  if (sentimentFilter) {
    const text = [row.title, row.original, row.rewritten, row.actionItems].filter(Boolean).join(' ')
    const sentiment = analyzeSentiment(text)
    if (sentimentFilter.kind === 'tone') {
      if (sentiment.label !== sentimentFilter.value) return false
    } else {
      const target = sentiment.emotions[sentimentFilter.value] ?? 0
      if (target === 0) return false
      const sorted = Object.values(sentiment.emotions).sort((a, b) => b - a)
      const threshold = sorted[1] ?? 0
      if (target < threshold) return false
    }
  }

  return true
}

export function sortRows(rows: BrainRow[], sortBy: SortKey = 'date-desc') {
  if (sortBy === 'date-desc' || sortBy === 'date-asc') {
    const timestamps = new Map(rows.map((row) => [row._rowIndex, row.createdAt ? new Date(row.createdAt).getTime() : 0]))
    return [...rows].sort((a, b) =>
      sortBy === 'date-desc'
        ? (timestamps.get(b._rowIndex) ?? 0) - (timestamps.get(a._rowIndex) ?? 0)
        : (timestamps.get(a._rowIndex) ?? 0) - (timestamps.get(b._rowIndex) ?? 0)
    )
  }
  if (sortBy === 'num-asc' || sortBy === 'num-desc') {
    const numbers = new Map(rows.map((row) => [row._rowIndex, parseFloat(row.srNo || '0')]))
    return [...rows].sort((a, b) =>
      sortBy === 'num-asc'
        ? (numbers.get(a._rowIndex) ?? 0) - (numbers.get(b._rowIndex) ?? 0)
        : (numbers.get(b._rowIndex) ?? 0) - (numbers.get(a._rowIndex) ?? 0)
    )
  }
  return [...rows].sort((a, b) => {
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title)
    if (sortBy === 'cat-asc') return a.category.localeCompare(b.category)
    return 0
  })
}

export function filterAndSortRows(
  rows: BrainRow[],
  filters: FilterStateLike,
  sentimentFilter: SentimentFilter | null,
  today = toLocalISODate(),
) {
  return sortRows(
    rows.filter((row) => rowMatchesFilters(row, filters, sentimentFilter, today)),
    filters.sortBy ?? 'date-desc',
  )
}
