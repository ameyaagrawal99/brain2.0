import { Search, X, CalendarDays, Calendar, SlidersHorizontal } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

function useSearchFocus(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [inputRef])
}

const STATUS_OPTIONS = [
  { value: '',           label: 'All statuses' },
  { value: 'done',       label: '✓ Done' },
  { value: 'progress',   label: '⟳ In Progress' },
  { value: 'pending',    label: '○ Pending' },
  { value: 'blocked',    label: '✕ Blocked' },
  { value: 'review',     label: '◉ In Review' },
]

const SORT_OPTIONS = [
  { value: 'date-desc',  label: 'Newest first' },
  { value: 'date-asc',   label: 'Oldest first' },
  { value: 'title-asc',  label: 'A → Z' },
  { value: 'num-asc',    label: 'Seq ↑' },
  { value: 'num-desc',   label: 'Seq ↓' },
] as const

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

  const { categories, topTags, hasActiveFilters, filteredRows } = useFilters()

  const [localSearch, setLocalSearch] = useState(filters.search)
  const debounced = useDebounce(localSearch, 200)
  useEffect(() => { setSearch(debounced) }, [debounced, setSearch])

  const searchRef   = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showFilters,    setShowFilters]    = useState(false)
  const filterPanelRef = useRef<HTMLDivElement>(null)
  useSearchFocus(searchRef)

  useEffect(() => {
    function click(e: MouseEvent) {
      if (datePickerRef.current  && !datePickerRef.current.contains(e.target as Node))  setShowDatePicker(false)
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) setShowFilters(false)
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  function getDateLabel() {
    const { dateFrom, dateTo } = filters
    if (!dateFrom && !dateTo) return null
    if (dateFrom === today && dateTo === today) return 'Today'
    if (dateFrom && dateTo && dateFrom === dateTo) return dateFrom
    if (dateFrom && dateTo) return `${dateFrom.slice(5)} – ${dateTo.slice(5)}`
    if (dateFrom) return `From ${dateFrom.slice(5)}`
    if (dateTo)   return `Until ${dateTo.slice(5)}`
    return null
  }

  function setQuickRange(from: string, to: string) { setDateRange(from, to); setShowDatePicker(false) }
  function getLast7Days()  { const d = new Date(); d.setDate(d.getDate() - 6);  return { from: d.toISOString().slice(0, 10), to: today } }
  function getLast30Days() { const d = new Date(); d.setDate(d.getDate() - 29); return { from: d.toISOString().slice(0, 10), to: today } }
  function getWeekRange()  { const d = new Date(); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return { from: mon.toISOString().slice(0, 10), to: today } }
  function getMonthRange() { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, to: today } }

  const dateLabel   = getDateLabel()
  const hasDate     = !!(filters.dateFrom || filters.dateTo)
  const activeCount = [filters.category, filters.subCategory, filters.status, hasDate ? 1 : null].filter(Boolean).length
                    + filters.selectedTags.length

  const pillCls = (active: boolean) => cn(
    'shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer border',
    active
      ? 'bg-brand text-white border-transparent shadow-sm'
      : 'bg-surface text-ink2 border-border hover:border-brand/40 hover:text-ink'
  )

  return (
    <div className="sticky top-12 z-20 bg-surface/95 backdrop-blur-sm border-b border-border sm:ml-14">
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2">

        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full h-8 pl-8 pr-16 text-sm bg-surface2 border border-border rounded-lg
              text-ink placeholder:text-ink3
              focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
              transition-all"
          />
          {localSearch ? (
            <button onClick={() => { setLocalSearch(''); setSearch('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2
              hidden sm:flex items-center text-[9px] text-ink3 bg-surface border border-border rounded px-1 py-0.5 pointer-events-none font-medium">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Scrollable pill row */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">

          {/* Date pill */}
          <div className="relative shrink-0" ref={datePickerRef}>
            <button onClick={() => setShowDatePicker(v => !v)}
              className={cn(pillCls(hasDate), 'gap-1')}>
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{dateLabel ?? 'Date'}</span>
              {hasDate && (
                <span onClick={(e) => { e.stopPropagation(); setDateRange(null, null) }}
                  className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-white/30">
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-72 animate-scaleIn">
                <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2">Quick select</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[
                    { label: 'Today',        fn: () => setQuickRange(today, today) },
                    { label: 'Yesterday',    fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const y = d.toISOString().slice(0,10); setQuickRange(y, y) } },
                    { label: 'Last 7 days',  fn: () => { const r = getLast7Days();   setQuickRange(r.from, r.to) } },
                    { label: 'Last 30 days', fn: () => { const r = getLast30Days();  setQuickRange(r.from, r.to) } },
                    { label: 'This week',    fn: () => { const r = getWeekRange();   setQuickRange(r.from, r.to) } },
                    { label: 'This month',   fn: () => { const r = getMonthRange();  setQuickRange(r.from, r.to) } },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn}
                      className="px-2.5 py-1 text-xs bg-surface2 border border-border rounded-lg hover:bg-hover hover:border-brand/30 text-ink transition-colors">
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2">Custom range</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-ink3 block mb-0.5">From</label>
                    <input type="date" value={filters.dateFrom ?? ''}
                      onChange={(e) => setDateRange(e.target.value || null, filters.dateTo)}
                      className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40" />
                  </div>
                  <div>
                    <label className="text-[10px] text-ink3 block mb-0.5">To</label>
                    <input type="date" value={filters.dateTo ?? ''} min={filters.dateFrom ?? undefined}
                      onChange={(e) => setDateRange(filters.dateFrom, e.target.value || null)}
                      className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40" />
                  </div>
                </div>
                {hasDate && (
                  <button onClick={() => { setDateRange(null, null); setShowDatePicker(false) }}
                    className="mt-3 w-full text-xs text-ink2 hover:text-ink border border-border rounded-lg py-1.5 hover:bg-hover transition-colors flex items-center justify-center gap-1">
                    <X className="w-3 h-3" />Clear dates
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Category pills */}
          {categories.slice(0, 8).map((cat) => (
            <button key={cat}
              onClick={() => setCategory(filters.category === cat ? '' : cat)}
              className={pillCls(filters.category === cat)}>
              {cat}
            </button>
          ))}

          {/* Tag pills */}
          {topTags.slice(0, 12).map((tag) => (
            <button key={tag}
              onClick={() => toggleTag(tag)}
              className={pillCls(filters.selectedTags.includes(tag))}>
              #{tag}
            </button>
          ))}
        </div>

        {/* Filters panel toggle */}
        <div className="relative shrink-0" ref={filterPanelRef}>
          <button onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all shrink-0',
              activeCount > 0 || showFilters
                ? 'bg-brand/8 border-brand/30 text-brand'
                : 'bg-surface2 border-border text-ink2 hover:bg-hover hover:text-ink'
            )}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-1.5 z-50 bg-surface border border-border rounded-xl shadow-xl p-4 w-72 animate-scaleIn space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-2">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setStatus(opt.value)}
                      className={cn(
                        'h-7 px-2.5 rounded-full text-xs font-medium border transition-all',
                        filters.status === opt.value
                          ? 'bg-brand text-white border-transparent'
                          : 'bg-surface2 border-border text-ink2 hover:bg-hover'
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-ink2 uppercase tracking-wider block mb-2">Sort by</label>
                <div className="flex flex-col gap-1">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setSortBy(opt.value as typeof filters.sortBy)}
                      className={cn(
                        'flex items-center justify-between w-full h-8 px-3 rounded-lg text-xs font-medium transition-all border',
                        filters.sortBy === opt.value
                          ? 'bg-brand/8 border-brand/30 text-brand'
                          : 'bg-surface2 border-transparent text-ink2 hover:bg-hover'
                      )}>
                      {opt.label}
                      {filters.sortBy === opt.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button onClick={() => { clearFilters(); setLocalSearch(''); setShowFilters(false) }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium
                    text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Result count */}
        <span className="text-xs text-ink3 whitespace-nowrap shrink-0 hidden sm:block">
          {filteredRows.length.toLocaleString()}
        </span>

        {/* Clear active filters inline */}
        {hasActiveFilters && (
          <button onClick={() => { clearFilters(); setLocalSearch('') }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-surface2 border border-border text-ink3 hover:bg-hover hover:text-ink transition-colors"
            title="Clear all filters">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
