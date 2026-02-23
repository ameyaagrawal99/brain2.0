import { Search, X, ChevronDown } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function FilterBar() {
  const filters        = useBrainStore((s) => s.filters)
  const setSearch      = useBrainStore((s) => s.setSearch)
  const setCategory    = useBrainStore((s) => s.setCategory)
  const setSubCategory = useBrainStore((s) => s.setSubCategory)
  const setStatus      = useBrainStore((s) => s.setStatus)
  const toggleTag      = useBrainStore((s) => s.toggleTag)
  const setSortBy      = useBrainStore((s) => s.setSortBy)
  const clearFilters   = useBrainStore((s) => s.clearFilters)

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
    { value: 'date-desc', label: 'Newest' },
    { value: 'date-asc',  label: 'Oldest' },
    { value: 'title-asc', label: 'A to Z' },
    { value: 'num-asc',   label: 'Sr# asc' },
    { value: 'num-desc',  label: 'Sr# desc' },
  ] as const

  return (
    <div className="border-b border-border bg-surface/90 backdrop-blur-sm sticky top-14 z-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 space-y-2">

        {/* Row 1: Search + dropdowns */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3 pointer-events-none" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-8 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => { setLocalSearch(''); setSearch('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.length > 0 && (
              <DropSelect
                value={filters.category}
                onChange={setCategory}
                options={[{ value: '', label: 'Category' }, ...categories.map((c) => ({ value: c, label: c }))]}
                active={!!filters.category}
              />
            )}

            {subCategories.length > 0 && (
              <DropSelect
                value={filters.subCategory}
                onChange={setSubCategory}
                options={[{ value: '', label: 'Sub-cat' }, ...subCategories.map((c) => ({ value: c, label: c }))]}
                active={!!filters.subCategory}
              />
            )}

            <DropSelect
              value={filters.status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
              active={!!filters.status}
            />

            <DropSelect
              value={filters.sortBy}
              onChange={(v) => setSortBy(v as typeof filters.sortBy)}
              options={SORT_OPTIONS as unknown as { value: string; label: string }[]}
              active={false}
            />
          </div>

          {/* Count + clear */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-xs text-ink3 whitespace-nowrap">{filteredRows.length} entries</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tag pills — scrollable on mobile */}
        {topTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {topTags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn('tag-chip shrink-0 text-[11px]', filters.selectedTags.includes(tag) && 'active')}
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

function DropSelect({
  value, onChange, options, active,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  active: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 pl-2.5 pr-6 text-xs border rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer transition-colors',
          active
            ? 'bg-brand/8 border-brand/30 text-brand font-medium'
            : 'bg-surface2 border-border text-ink'
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink3 pointer-events-none" />
    </div>
  )
}
