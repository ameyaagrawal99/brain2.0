import { Search, X, CalendarDays, SlidersHorizontal, Check, ChevronDown, BookmarkCheck, Loader2, Plus, Trash2 } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useFilters } from '@/hooks/useFilters'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { EMOTION_META } from '@/lib/sentiment'
import { addLocalDays, toLocalISODate } from '@/lib/date'
import { deleteQuickFilter, fetchQuickFilters, saveQuickFilter, type QuickFilter } from '@/lib/sheetsConfig'
import toast from 'react-hot-toast'

/* ── Keyboard shortcut: ⌘K focuses search, ⌘F opens filter panel ─── */
function useFilterKeys(
  searchRef: React.RefObject<HTMLInputElement | null>,
  onOpenFilters: () => void,
) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        onOpenFilters()
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [searchRef, onOpenFilters])
}

const STATUS_OPTS = [
  { value: 'done',     label: 'Done',        dot: 'bg-ok' },
  { value: 'progress', label: 'In Progress',  dot: 'bg-info' },
  { value: 'pending',  label: 'Pending',      dot: 'bg-warn' },
  { value: 'blocked',  label: 'Blocked',      dot: 'bg-danger' },
  { value: 'review',   label: 'In Review',    dot: 'bg-purple' },
]

const SORT_OPTS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc',  label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A → Z'  },
  { value: 'num-asc',   label: 'Seq ↑'         },
  { value: 'num-desc',  label: 'Seq ↓'         },
] as const

/* ── Small reusable checkbox row ─────────────────────────────────── */
function CheckRow({
  label, checked, onChange, dot,
}: {
  label: string
  checked: boolean
  onChange: () => void
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left',
        checked
          ? 'bg-brand/10 text-brand font-medium'
          : 'text-ink2 hover:bg-hover hover:text-ink',
      )}
    >
      <span className={cn(
        'w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors',
        checked ? 'bg-brand border-brand' : 'border-border bg-surface',
      )}>
        {checked && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />}
      <span className="truncate">{label}</span>
    </button>
  )
}

/* ── Collapsible section header ──────────────────────────────────── */
function SectionHead({
  label, count, isOpen, onToggle,
}: {
  label: string
  count?: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between mb-1.5 group"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wider">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-bold bg-brand text-white rounded-full px-1.5 py-px leading-none">
            {count}
          </span>
        )}
      </div>
      <ChevronDown
        className={cn(
          'w-3.5 h-3.5 text-ink3 transition-transform duration-150',
          isOpen ? 'rotate-0' : '-rotate-90',
        )}
      />
    </button>
  )
}

/* ── Mini search inside a section ───────────────────────────────── */
function SectionSearch({
  value, onChange, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative mb-1.5">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="w-full h-6 pl-6 pr-6 text-[11px] bg-surface2 border border-border rounded-md
          text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

/* ── Active filter chip ──────────────────────────────────────────── */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 h-6 px-2 rounded-full text-[11px] font-medium
      bg-brand/10 text-brand border border-brand/20 whitespace-nowrap">
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-brand/20 transition-colors"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  )
}

/* ── Main FilterBar ──────────────────────────────────────────────── */
export function FilterBar() {
  const filters             = useBrainStore((s) => s.filters)
  const setSearch           = useBrainStore((s) => s.setSearch)
  const toggleCategory      = useBrainStore((s) => s.toggleCategory)
  const toggleSubCategory   = useBrainStore((s) => s.toggleSubCategory)
  const toggleStatus        = useBrainStore((s) => s.toggleStatus)
  const togglePerson        = useBrainStore((s) => s.togglePerson)
  const toggleTag           = useBrainStore((s) => s.toggleTag)
  const setTagMatchMode     = useBrainStore((s) => s.setTagMatchMode)
  const setSortBy           = useBrainStore((s) => s.setSortBy)
  const setDateRange        = useBrainStore((s) => s.setDateRange)
  const setFilters          = useBrainStore((s) => s.setFilters)
  const clearFilters        = useBrainStore((s) => s.clearFilters)
  const sentimentFilter     = useBrainStore((s) => s.sentimentFilter)
  const setSentimentFilter  = useBrainStore((s) => s.setSentimentFilter)
  const demoMode            = useBrainStore((s) => s.settings.demoMode)

  const { categories, subCategories, topTags, allPeople, hasActiveFilters, activeFilterCount, filteredRows } = useFilters()

  /* ── Search debounce ─────────────────────────────────────────── */
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debounced = useDebounce(localSearch, 200)
  useEffect(() => { setSearch(debounced) }, [debounced, setSearch])
  // Sync if cleared externally
  useEffect(() => { if (!filters.search && localSearch) setLocalSearch('') }, [filters.search])

  const searchRef = useRef<HTMLInputElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([])
  const [quickName, setQuickName] = useState('')
  const [loadingQuick, setLoadingQuick] = useState(false)
  const [savingQuick, setSavingQuick] = useState(false)

  /* ── Collapsible section state ───────────────────────────────── */
  const ALL_SECTIONS = ['category', 'subcategory', 'status', 'tags', 'people', 'date', 'due', 'sort'] as const
  type SectionKey = typeof ALL_SECTIONS[number]
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(ALL_SECTIONS),
  )
  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  /* ── Per-section search queries ──────────────────────────────── */
  const SEARCH_THRESHOLD = 6
  const [catSearch,    setCatSearch]    = useState('')
  const [subCatSearch, setSubCatSearch] = useState('')
  const [tagSearch,    setTagSearch]    = useState('')
  const [peopleSearch, setPeopleSearch] = useState('')

  function resetSectionSearches() {
    setCatSearch(''); setSubCatSearch(''); setTagSearch(''); setPeopleSearch('')
  }

  useFilterKeys(searchRef, () => setShowFilters(true))

  useEffect(() => {
    if (!showFilters || demoMode) return
    setLoadingQuick(true)
    fetchQuickFilters()
      .then(setQuickFilters)
      .finally(() => setLoadingQuick(false))
  }, [showFilters, demoMode])

  async function handleSaveQuickFilter() {
    const name = quickName.trim()
    if (!name) return
    setSavingQuick(true)
    try {
      const qf: QuickFilter = {
        name,
        search: localSearch || filters.search || '',
        categories: filters.categories,
        subCategories: filters.subCategories,
        statuses: filters.statuses,
        persons: filters.persons,
        selectedTags: filters.selectedTags,
        tagMatchMode: filters.tagMatchMode,
        sortBy: filters.sortBy,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        dueDateFrom: filters.dueDateFrom,
        dueDateTo: filters.dueDateTo,
        showToday: filters.showToday,
        sentimentFilter,
      }
      await saveQuickFilter(qf)
      setQuickFilters((prev) => {
        const idx = prev.findIndex((item) => item.name.toLowerCase() === name.toLowerCase())
        return idx >= 0 ? prev.map((item, i) => i === idx ? qf : item) : [...prev, qf]
      })
      setQuickName('')
      toast.success('Saved view')
    } catch {
      toast.error('Failed to save view')
    } finally {
      setSavingQuick(false)
    }
  }

  function handleApplyQuickFilter(qf: QuickFilter) {
    setLocalSearch(qf.search || '')
    setFilters({
      search: qf.search || '',
      categories: qf.categories ?? [],
      subCategories: qf.subCategories ?? [],
      statuses: qf.statuses ?? [],
      persons: qf.persons ?? [],
      selectedTags: qf.selectedTags ?? [],
      tagMatchMode: qf.tagMatchMode ?? 'and',
      sortBy: (qf.sortBy || 'date-desc') as typeof filters.sortBy,
      dateFrom: qf.dateFrom ?? null,
      dateTo: qf.dateTo ?? null,
      dueDateFrom: qf.dueDateFrom ?? null,
      dueDateTo: qf.dueDateTo ?? null,
      showToday: qf.showToday ?? false,
    })
    setSentimentFilter(qf.sentimentFilter ?? null)
    setShowFilters(false)
    toast.success(`Applied "${qf.name}"`)
  }

  async function handleDeleteQuickFilter(name: string) {
    try {
      await deleteQuickFilter(name)
      setQuickFilters((prev) => prev.filter((item) => item.name !== name))
      toast.success('Deleted view')
    } catch {
      toast.error('Failed to delete view')
    }
  }

  /* ── Close panel on outside click ───────────────────────────── */
  useEffect(() => {
    function click(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowFilters(false)
        resetSectionSearches()
      }
    }
    document.addEventListener('mousedown', click)
    return () => document.removeEventListener('mousedown', click)
  }, [])

  /* ── Date helpers ────────────────────────────────────────────── */
  const today = toLocalISODate()
  const hasDate = !!(filters.dateFrom || filters.dateTo)
  const hasDueDate = !!(filters.dueDateFrom || filters.dueDateTo)

  function dateLabel() {
    const { dateFrom: from, dateTo: to } = filters
    if (!from && !to) return null
    if (from === today && to === today) return 'Today'
    if (from && to && from === to) return from
    if (from && to) return `${from.slice(5)} – ${to.slice(5)}`
    if (from) return `From ${from.slice(5)}`
    if (to)   return `Until ${to.slice(5)}`
    return null
  }

  function setQuickRange(from: string, to: string) { setDateRange(from, to) }
  function setDueRange(from: string | null, to: string | null) {
    setFilters({ dueDateFrom: from, dueDateTo: to })
  }
  function rangeLabel(from: string | null, to: string | null, fallback: string) {
    if (!from && !to) return null
    if (from === today && to === today) return 'Today'
    if (from && to && from === to) return from
    if (from && to) return `${from.slice(5)} - ${to.slice(5)}`
    if (from) return `From ${from.slice(5)}`
    if (to) return `Until ${to.slice(5)}`
    return fallback
  }
  const last7  = () => ({ from: toLocalISODate(addLocalDays(new Date(), -6)), to: today })
  const last30 = () => ({ from: toLocalISODate(addLocalDays(new Date(), -29)), to: today })
  const week   = () => { const d = new Date(); const m = addLocalDays(d, -((d.getDay() + 6) % 7)); return { from: toLocalISODate(m), to: today } }
  const month  = () => { const d = new Date(); return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, to: today } }

  const dl = dateLabel()
  const dueLabel = rangeLabel(filters.dueDateFrom, filters.dueDateTo, 'Due date')

  /* ── Chip labels ─────────────────────────────────────────────── */
  const sentimentChipLabel = sentimentFilter
    ? sentimentFilter.kind === 'tone'
      ? sentimentFilter.value
      : `${EMOTION_META[sentimentFilter.value].emoji} ${EMOTION_META[sentimentFilter.value].label}`
    : null

  const chipData = [
    ...filters.categories.map((c)    => ({ id: `cat:${c}`,    label: c,        remove: () => toggleCategory(c) })),
    ...filters.subCategories.map((c) => ({ id: `sub:${c}`,    label: `↳ ${c}`, remove: () => toggleSubCategory(c) })),
    ...filters.statuses.map((s)      => ({ id: `st:${s}`,     label: STATUS_OPTS.find((o) => o.value === s)?.label ?? s, remove: () => toggleStatus(s) })),
    ...filters.persons.map((p)       => ({ id: `per:${p}`,    label: `@${p}`,  remove: () => togglePerson(p) })),
    ...filters.selectedTags.map((t)  => ({ id: `tag:${t}`,    label: `#${t}`,  remove: () => toggleTag(t) })),
    ...(hasDate ? [{ id: 'date', label: dl ?? 'Date', remove: () => setDateRange(null, null) }] : []),
    ...(hasDueDate ? [{ id: 'due', label: `Due: ${dueLabel ?? 'date'}`, remove: () => setDueRange(null, null) }] : []),
    ...(sentimentChipLabel ? [{ id: 'sentiment', label: sentimentChipLabel, remove: () => setSentimentFilter(null) }] : []),
  ]

  return (
    <div className="sticky top-12 z-20 bg-surface/95 backdrop-blur-sm border-b border-border sm:ml-14">

      {/* ── Main row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3 pointer-events-none" />
          <input
            ref={searchRef}
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full h-8 pl-8 pr-8 text-sm bg-surface2 border border-border rounded-lg
              text-ink placeholder:text-ink3
              focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
              transition-[border-color,box-shadow]"
          />
          {localSearch ? (
            <button onClick={() => { setLocalSearch(''); setSearch('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center
              text-[9px] text-ink3 bg-surface border border-border rounded px-1 py-0.5 pointer-events-none font-medium">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Date indicator pill (quick access, mirrors section inside panel) */}
        {hasDate && (
          <button
            onClick={() => { setShowFilters(true); if (!openSections.has('date')) toggleSection('date') }}
            className="flex items-center gap-1 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all
              bg-brand/8 border-brand/30 text-brand shrink-0"
          >
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{dl}</span>
            <span
              onClick={(e) => { e.stopPropagation(); setDateRange(null, null) }}
              className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-brand/20 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </button>
        )}

        {/* Filters panel toggle */}
        <div className="relative shrink-0" ref={panelRef}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filters"
            className={cn(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all',
              activeFilterCount > 0 || showFilters
                ? 'bg-brand/8 border-brand/30 text-brand'
                : 'bg-surface2 border-border text-ink2 hover:bg-hover hover:text-ink',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center leading-none shrink-0">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* ── Filter panel ───────────────────────────────────────── */}
          {showFilters && (
            <div className="fixed left-3 right-3 top-[6.25rem] z-50 max-h-[calc(100svh-7rem)]
              sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-[360px] sm:max-h-[80vh]
              bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden
              animate-scaleIn flex flex-col">

              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <span className="text-sm font-semibold text-ink">Filters</span>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={() => { clearFilters(); setLocalSearch('') }}
                      className="text-xs text-danger hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => { setShowFilters(false); resetSectionSearches() }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto p-4 space-y-3">
                <div className="rounded-xl border border-border bg-surface2/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-ink">Saved views</p>
                      <p className="text-[10px] text-ink3">Save and reapply full filter state.</p>
                    </div>
                    {loadingQuick && <Loader2 className="w-3.5 h-3.5 text-ink3 animate-spin" />}
                  </div>
                  {!demoMode && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickName}
                        onChange={(e) => setQuickName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveQuickFilter()}
                        placeholder="Name this view…"
                        className="min-w-0 flex-1 h-8 rounded-lg border border-border bg-surface px-2 text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand/40"
                      />
                      <button
                        onClick={handleSaveQuickFilter}
                        disabled={!quickName.trim() || savingQuick}
                        className="h-8 px-2.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40"
                      >
                        {savingQuick ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {demoMode ? (
                    <p className="text-[11px] text-ink3">Saved views sync through Google Sheets and are disabled in demo mode.</p>
                  ) : quickFilters.length > 0 ? (
                    <div className="space-y-1">
                      {quickFilters.map((qf) => (
                        <div key={qf.name} className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-2 py-1.5">
                          <button onClick={() => handleApplyQuickFilter(qf)} className="min-w-0 flex-1 text-left">
                            <p className="truncate text-xs font-medium text-ink">{qf.name}</p>
                            <p className="truncate text-[10px] text-ink3">
                              {[qf.search && `"${qf.search}"`, qf.categories?.join(', '), qf.statuses?.join(', '), qf.dateFrom || qf.dateTo ? 'date' : '', qf.dueDateFrom || qf.dueDateTo ? 'due' : '', qf.sentimentFilter ? 'sentiment' : ''].filter(Boolean).join(' · ') || 'All entries'}
                            </p>
                          </button>
                          <button onClick={() => handleApplyQuickFilter(qf)} className="text-brand p-1 rounded hover:bg-brand/10" aria-label={`Apply ${qf.name}`}>
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteQuickFilter(qf.name)} className="text-ink3 p-1 rounded hover:bg-red-50 hover:text-red-500" aria-label={`Delete ${qf.name}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink3">No saved views yet.</p>
                  )}
                </div>

                {/* ── Category ── */}
                {categories.length > 0 && (
                  <div>
                    <SectionHead
                      label="Category"
                      count={filters.categories.length}
                      isOpen={openSections.has('category')}
                      onToggle={() => toggleSection('category')}
                    />
                    {openSections.has('category') && (
                      <>
                        {categories.length >= SEARCH_THRESHOLD && (
                          <SectionSearch value={catSearch} onChange={setCatSearch} placeholder="Search categories…" />
                        )}
                        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                          {categories
                            .filter((c) => !catSearch || c.toLowerCase().includes(catSearch.toLowerCase()))
                            .map((cat) => (
                              <CheckRow
                                key={cat}
                                label={cat}
                                checked={filters.categories.includes(cat)}
                                onChange={() => toggleCategory(cat)}
                              />
                            ))}
                          {catSearch && categories.filter((c) => c.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-ink3 px-2 py-1.5">No match</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Sub-category ── */}
                {subCategories.length > 0 && (
                  <div>
                    <SectionHead
                      label="Sub-category"
                      count={filters.subCategories.length}
                      isOpen={openSections.has('subcategory')}
                      onToggle={() => toggleSection('subcategory')}
                    />
                    {openSections.has('subcategory') && (
                      <>
                        {subCategories.length >= SEARCH_THRESHOLD && (
                          <SectionSearch value={subCatSearch} onChange={setSubCatSearch} placeholder="Search sub-categories…" />
                        )}
                        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                          {subCategories
                            .filter((s) => !subCatSearch || s.toLowerCase().includes(subCatSearch.toLowerCase()))
                            .map((sc) => (
                              <CheckRow
                                key={sc}
                                label={sc}
                                checked={filters.subCategories.includes(sc)}
                                onChange={() => toggleSubCategory(sc)}
                              />
                            ))}
                          {subCatSearch && subCategories.filter((s) => s.toLowerCase().includes(subCatSearch.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-ink3 px-2 py-1.5">No match</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Status ── */}
                <div>
                  <SectionHead
                    label="Status"
                    count={filters.statuses.length}
                    isOpen={openSections.has('status')}
                    onToggle={() => toggleSection('status')}
                  />
                  {openSections.has('status') && (
                    <div className="space-y-0.5">
                      {STATUS_OPTS.map((opt) => (
                        <CheckRow
                          key={opt.value}
                          label={opt.label}
                          dot={opt.dot}
                          checked={filters.statuses.includes(opt.value)}
                          onChange={() => toggleStatus(opt.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Tags ── */}
                {topTags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSection('tags')}
                        className="flex items-center gap-1.5 group flex-1"
                      >
                        <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wider">Tags</span>
                        {filters.selectedTags.length > 0 && (
                          <span className="text-[9px] font-bold bg-brand text-white rounded-full px-1.5 py-px leading-none">
                            {filters.selectedTags.length}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-3.5 h-3.5 text-ink3 transition-transform duration-150 ml-auto',
                            openSections.has('tags') ? 'rotate-0' : '-rotate-90',
                          )}
                        />
                      </button>
                      {/* AND / OR toggle — always visible */}
                      <div className="flex items-center gap-0.5 bg-surface2 border border-border rounded-lg p-0.5 shrink-0 ml-2">
                        {(['and', 'or'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTagMatchMode(mode)}
                            className={cn(
                              'h-5 px-1.5 rounded text-[10px] font-bold transition-colors',
                              filters.tagMatchMode === mode
                                ? 'bg-brand text-white'
                                : 'text-ink3 hover:text-ink',
                            )}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    {openSections.has('tags') && (
                      <>
                        {topTags.length >= SEARCH_THRESHOLD && (
                          <SectionSearch value={tagSearch} onChange={setTagSearch} placeholder="Search tags…" />
                        )}
                        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                          {topTags
                            .filter((t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()))
                            .map((tag) => (
                              <CheckRow
                                key={tag}
                                label={`#${tag}`}
                                checked={filters.selectedTags.includes(tag)}
                                onChange={() => toggleTag(tag)}
                              />
                            ))}
                          {tagSearch && topTags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-ink3 px-2 py-1.5">No match</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── People ── */}
                {allPeople.length > 0 && (
                  <div>
                    <SectionHead
                      label="People"
                      count={filters.persons.length}
                      isOpen={openSections.has('people')}
                      onToggle={() => toggleSection('people')}
                    />
                    {openSections.has('people') && (
                      <>
                        {allPeople.length >= SEARCH_THRESHOLD && (
                          <SectionSearch value={peopleSearch} onChange={setPeopleSearch} placeholder="Search people…" />
                        )}
                        <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                          {allPeople
                            .filter((p) => !peopleSearch || p.toLowerCase().includes(peopleSearch.toLowerCase()))
                            .map((person) => (
                              <CheckRow
                                key={person}
                                label={person}
                                checked={filters.persons.includes(person)}
                                onChange={() => togglePerson(person)}
                              />
                            ))}
                          {peopleSearch && allPeople.filter((p) => p.toLowerCase().includes(peopleSearch.toLowerCase())).length === 0 && (
                            <p className="text-[11px] text-ink3 px-2 py-1.5">No match</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Date ── */}
                <div>
                  <SectionHead
                    label="Date"
                    count={hasDate ? 1 : undefined}
                    isOpen={openSections.has('date')}
                    onToggle={() => toggleSection('date')}
                  />
                  {openSections.has('date') && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Today',        fn: () => setQuickRange(today, today) },
                          { label: 'Yesterday',    fn: () => { const y = toLocalISODate(addLocalDays(new Date(), -1)); setQuickRange(y, y) } },
                          { label: 'Last 7 days',  fn: () => { const r = last7();  setQuickRange(r.from, r.to) } },
                          { label: 'Last 30 days', fn: () => { const r = last30(); setQuickRange(r.from, r.to) } },
                          { label: 'This week',    fn: () => { const r = week();   setQuickRange(r.from, r.to) } },
                          { label: 'This month',   fn: () => { const r = month();  setQuickRange(r.from, r.to) } },
                        ].map(({ label, fn }) => (
                          <button
                            key={label}
                            onClick={fn}
                            className={cn(
                              'px-2.5 py-1 text-xs border rounded-lg transition-colors',
                              hasDate && dl === label
                                ? 'bg-brand/10 border-brand/30 text-brand font-medium'
                                : 'bg-surface2 border-border hover:bg-hover hover:border-brand/30 text-ink',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-ink3 block mb-0.5">From</label>
                          <input
                            type="date"
                            value={filters.dateFrom ?? ''}
                            onChange={(e) => setDateRange(e.target.value || null, filters.dateTo)}
                            className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40"
                          />
                        </div>
                        <div>
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
                      {hasDate && (
                        <button
                          onClick={() => setDateRange(null, null)}
                          className="w-full text-xs text-ink2 hover:text-ink border border-border rounded-lg py-1.5 hover:bg-hover transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />Clear dates
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Due date ── */}
                <div>
                  <SectionHead
                    label="Due date"
                    count={hasDueDate ? 1 : undefined}
                    isOpen={openSections.has('due')}
                    onToggle={() => toggleSection('due')}
                  />
                  {openSections.has('due') && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Overdue',     fn: () => setDueRange(null, toLocalISODate(addLocalDays(new Date(), -1))) },
                          { label: 'Today',       fn: () => setDueRange(today, today) },
                          { label: 'Next 7 days', fn: () => setDueRange(today, toLocalISODate(addLocalDays(new Date(), 7))) },
                        ].map(({ label, fn }) => (
                          <button
                            key={label}
                            onClick={fn}
                            className="px-2.5 py-1 text-xs border rounded-lg transition-colors bg-surface2 border-border hover:bg-hover hover:border-brand/30 text-ink"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-ink3 block mb-0.5">From</label>
                          <input
                            type="date"
                            value={filters.dueDateFrom ?? ''}
                            onChange={(e) => setDueRange(e.target.value || null, filters.dueDateTo)}
                            className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-ink3 block mb-0.5">To</label>
                          <input
                            type="date"
                            value={filters.dueDateTo ?? ''}
                            min={filters.dueDateFrom ?? undefined}
                            onChange={(e) => setDueRange(filters.dueDateFrom, e.target.value || null)}
                            className="w-full h-7 px-2 text-xs bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand/40"
                          />
                        </div>
                      </div>
                      {hasDueDate && (
                        <button
                          onClick={() => setDueRange(null, null)}
                          className="w-full text-xs text-ink2 hover:text-ink border border-border rounded-lg py-1.5 hover:bg-hover transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />Clear due dates
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Sort ── */}
                <div>
                  <SectionHead
                    label="Sort by"
                    isOpen={openSections.has('sort')}
                    onToggle={() => toggleSection('sort')}
                  />
                  {openSections.has('sort') && (
                    <div className="space-y-0.5">
                      {SORT_OPTS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSortBy(opt.value as typeof filters.sortBy)}
                          className={cn(
                            'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors',
                            filters.sortBy === opt.value
                              ? 'bg-brand/10 text-brand font-medium'
                              : 'text-ink2 hover:bg-hover hover:text-ink',
                          )}
                        >
                          <span>{opt.label}</span>
                          {filters.sortBy === opt.value && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Panel footer — result count */}
              <div className="px-4 py-2.5 border-t border-border shrink-0 flex items-center justify-between">
                <span className="text-xs text-ink3">
                  {filteredRows.length.toLocaleString()} {filteredRows.length === 1 ? 'entry' : 'entries'}
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setShowFilters(false); resetSectionSearches() }}
                    className="h-7 px-3 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Result count */}
        <span className="text-xs text-ink3 whitespace-nowrap shrink-0 hidden lg:block">
          {filteredRows.length.toLocaleString()} shown
        </span>

        {/* Clear all (when active) */}
        {hasActiveFilters && (
          <button
            onClick={() => { clearFilters(); setLocalSearch('') }}
            aria-label="Clear all filters"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-surface2 border border-border text-ink3 hover:bg-hover hover:text-danger transition-colors"
            title="Clear all filters"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Active filter chips ───────────────────────────────────── */}
      {chipData.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 sm:px-4 pb-2 overflow-x-auto scrollbar-hide">
          {chipData.map(({ id, label, remove }) => (
            <FilterChip key={id} label={label} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  )
}
