import { Search, X, ChevronDown, CalendarDays, Calendar } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

export function FilterBar() {
  const filters        = useBrainStore((s) => s.filters)
  const setSearch      = useBrainStore((s) => s.setSearch)
  const setCategory    = useBrainStore((s) => s.setCategory)
  const setSubCategory = useBrainStore((s) => s.setSubCategory)
  const setStatus      = useBrainStore((s) => s.setStatus)
  const toggleTag      = useBrainStore((s) => s.toggleTag)
  const setSortBy      = useBrainStore((s) => s.setSortBy)
  const setDateRange   = useBrainStore((s) => s.setDateRange)
  const clearFilters   = useBrainStore((s) => s.clearFilters)

  const { categories, subCategories, topTags, hasActiveFilters, filteredRows } = useFilters()

  const [localSearch, setLocalSearch] = useState(filters.search)
  const debounced = useDebounce(localSearch, 250)
  useEffect(() => { setSearch(debounced) }, [debounced, setSearch])

  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Close date picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDatePicker])

  const today = new Date().toISOString().slice(0, 10)

  function getDateLabel() {
    const { dateFrom, dateTo } = filters
    if (!dateFrom && !dateTo) return null
    if (dateFrom === today && dateTo === today) return 'Today'
    if (dateFrom && dateTo && dateFrom === dateTo) return dateFrom
    if (dateFrom && dateTo) return `${dateFrom} – ${dateTo}`
    if (dateFrom) return `From ${dateFrom}`
    if (dateTo) return `Until ${dateTo}`
    return null
  }

  function setQuickRange(from: string, to: string) {
    setDateRange(from, to)
    setShowDatePicker(false)
  }

  function getWeekRange() {
    const d = new Date()
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - ((day + 6) % 7))
    return { from: mon.toISOString().slice(0, 10), to: today }
  }

  function getMonthRange() {
    const d = new Date()
    return {
      from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      to: today,
    }
  }

  function getLast7Days() {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return { from: d.toISOString().slice(0, 10), to: today }
  }

  function getLast30Days() {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return { from: d.toISOString().slice(0, 10), to: today }
  }

  const dateLabel = getDateLabel()
  const hasDate   = !!(filters.dateFrom || filters.dateTo)

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
    <div className="border-b border-border bg-surface/90 backdrop-blur-sm sticky top-12 sm:top-14 z-20">
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

          {/* Date range picker */}
          <div className="relative shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors',
                hasDate
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface2 border-border text-ink2 hover:bg-hover'
              )}
              title="Filter by date"
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:block max-w-[100px] truncate">
                {dateLabel ?? 'Date'}
              </span>
              {hasDate && (
                <span
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-white/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setDateRange(null, null) }}
                  title="Clear date filter"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>

            {/* Date picker dropdown */}
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-72">
                {/* Quick selects */}
                <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2">Quick select</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[
                    { label: 'Today',     fn: () => setQuickRange(today, today) },
                    { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const y = d.toISOString().slice(0,10); setQuickRange(y, y) } },
                    { label: 'Last 7 days',  fn: () => { const r = getLast7Days();   setQuickRange(r.from, r.to) } },
                    { label: 'Last 30 days', fn: () => { const r = getLast30Days();  setQuickRange(r.from, r.to) } },
                    { label: 'This week',    fn: () => { const r = getWeekRange();   setQuickRange(r.from, r.to) } },
                    { label: 'This month',   fn: () => { const r = getMonthRange();  setQuickRange(r.from, r.to) } },
                  ].map(({ label, fn }) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="px-2.5 py-1 text-xs bg-surface2 border border-border rounded-lg hover:bg-hover hover:border-brand/30 text-ink transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom range */}
                <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2">Custom range</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-ink3 shrink-0" />
                    <div className="flex-1">
                      <label className="text-[10px] text-ink3 block mb-0.5">From</label>
                      <input
                        type="date"
                        value={filters.dateFrom ?? ''}
                        onChange={(e) => setDateRange(e.target.value || null, filters.dateTo)}
                        className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-ink3 shrink-0" />
                    <div className="flex-1">
                      <label className="text-[10px] text-ink3 block mb-0.5">To</label>
                      <input
                        type="date"
                        value={filters.dateTo ?? ''}
                        min={filters.dateFrom ?? undefined}
                        onChange={(e) => setDateRange(filters.dateFrom, e.target.value || null)}
                        className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Clear */}
                {hasDate && (
                  <button
                    onClick={() => { setDateRange(null, null); setShowDatePicker(false) }}
                    className="mt-3 w-full text-xs text-ink2 hover:text-ink border border-border rounded-lg py-1.5 hover:bg-hover transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear date filter
                  </button>
                )}
              </div>
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
                onClick={() => { clearFilters(); setLocalSearch('') }}
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tag pills */}
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
