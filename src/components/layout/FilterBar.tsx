import { Search, X, ChevronDown } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function FilterBar() {
  const filters       = useBrainStore((s) => s.filters)
  const setSearch     = useBrainStore((s) => s.setSearch)
  const setCategory   = useBrainStore((s) => s.setCategory)
  const setSubCategory= useBrainStore((s) => s.setSubCategory)
  const setStatus     = useBrainStore((s) => s.setStatus)
  const toggleTag     = useBrainStore((s) => s.toggleTag)
  const setSortBy     = useBrainStore((s) => s.setSortBy)
  const clearFilters  = useBrainStore((s) => s.clearFilters)

  const { categories, subCategories, topTags, hasActiveFilters, filteredRows } = useFilters()

  const [localSearch, setLocalSearch] = useState(filters.search)
  const debounced = useDebounce(localSearch, 250)

  useEffect(() => { setSearch(debounced) }, [debounced, setSearch])

  const STATUS_OPTIONS = [
    { value: '',         label: 'All statuses' },
    { value: 'done',     label: 'Done' },
    { value: 'progress', label: 'In Progress' },
    { value: 'pending',  label: 'Pending' },
  ]

  const SORT_OPTIONS = [
    { value: 'date-desc', label: 'Newest first' },
    { value: 'date-asc',  label: 'Oldest first' },
    { value: 'title-asc', label: 'Title A\u2013Z' },
    { value: 'cat-asc',   label: 'Category' },
    { value: 'num-desc',  label: 'Sr# desc' },
    { value: 'num-asc',   label: 'Sr# asc' },
  ] as const

  return (
    <div className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {/* Search + filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3 pointer-events-none" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search entries\u2026"
              className="w-full h-8 pl-8 pr-4 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => { setLocalSearch(''); setSearch('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category */}
          <SelectFilter
            value={filters.category}
            onChange={setCategory}
            options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          />

          {/* Sub-category */}
          {subCategories.length > 0 && (
            <SelectFilter
              value={filters.subCategory}
              onChange={setSubCategory}
              options={[{ value: '', label: 'All sub-cats' }, ...subCategories.map((c) => ({ value: c, label: c }))]}
            />
          )}

          {/* Status */}
          <SelectFilter
            value={filters.status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />

          {/* Sort */}
          <SelectFilter
            value={filters.sortBy}
            onChange={(v) => setSortBy(v as typeof filters.sortBy)}
            options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
          />

          {/* Clear + count */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-ink3">{filteredRows.length} entries</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
            {topTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'tag-chip text-xs',
                  filters.selectedTags.includes(tag) && 'active'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SelectFilter({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-3 pr-7 text-xs bg-surface2 border border-border rounded-lg text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-brand/50 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink3 pointer-events-none" />
    </div>
  )
}
