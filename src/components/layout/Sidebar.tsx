import { useEffect, useMemo, useState } from 'react'
import {
  BarChart2, Calendar, Filter, X, Clock, Tag, CheckCircle,
  Loader2, Plus, Trash2, BookmarkCheck, TrendingUp, ListChecks,
  Square, CheckSquare2, Star, ChevronRight, Users,
} from 'lucide-react'
import { differenceInYears, differenceInMonths } from 'date-fns'
import { useBrainStore } from '@/store/useBrainStore'
import { parseTags, formatDate, cn, parseActionItems, toggleActionItem } from '@/lib/utils'
import { parsePeople } from '@/lib/contacts'
import { fetchQuickFilters, saveQuickFilter, deleteQuickFilter } from '@/lib/sheetsConfig'
import { useSheetSync } from '@/hooks/useSheetSync'
import type { QuickFilter } from '@/lib/sheetsConfig'
import type { BrainRow } from '@/types/sheet'
import toast from 'react-hot-toast'

type SidebarTab = 'stats' | 'due' | 'tasks' | 'activity' | 'filters' | 'milestones' | 'people'

const TABS: { key: SidebarTab; label: string; icon: typeof BarChart2 }[] = [
  { key: 'stats',      label: 'Stats',      icon: BarChart2 },
  { key: 'due',        label: 'Due Soon',   icon: Calendar },
  { key: 'tasks',      label: 'Tasks',      icon: ListChecks },
  { key: 'activity',   label: 'Activity',   icon: TrendingUp },
  { key: 'filters',    label: 'Filters',    icon: Filter },
  { key: 'people',     label: 'People',     icon: Users },
  { key: 'milestones', label: 'Milestones', icon: Star },
]

/** Rows whose action items are currently expanded in the sidebar */
function useExpandedRows() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (rowIndex: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(rowIndex) ? next.delete(rowIndex) : next.add(rowIndex)
      return next
    })
  return { expanded, toggle }
}

/** Shared action-item checklist for a single row */
function ActionItemList({
  row,
  onToggle,
  savingIndex,
}: {
  row: BrainRow
  onToggle: (row: BrainRow, lineIndex: number) => void
  savingIndex: number | null
}) {
  const items = parseActionItems(row.actionItems ?? '')
  if (!items.length) return <p className="text-[10px] text-ink3 italic px-1 py-0.5">No action items</p>

  return (
    <div className="space-y-0.5 mt-1.5 pl-1">
      {items.map(({ text, done, lineIndex }) => (
        <button
          key={lineIndex}
          onClick={(e) => { e.stopPropagation(); onToggle(row, lineIndex) }}
          disabled={savingIndex === lineIndex}
          className="w-full flex items-start gap-1.5 group/item py-0.5 rounded hover:bg-surface2 px-1 transition-colors text-left"
        >
          {savingIndex === lineIndex ? (
            <Loader2 className="w-3 h-3 text-brand animate-spin shrink-0 mt-0.5" />
          ) : done ? (
            <CheckSquare2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-3 h-3 text-ink3 group-hover/item:text-brand shrink-0 mt-0.5" />
          )}
          <span className={cn(
            'text-[11px] leading-snug',
            done ? 'line-through text-ink3' : 'text-ink2',
          )}>
            {text}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Sidebar() {
  const showSidebar    = useBrainStore((s) => s.showSidebar)
  const setShowSidebar = useBrainStore((s) => s.setShowSidebar)
  const rows           = useBrainStore((s) => s.rows)
  const openModal      = useBrainStore((s) => s.openModal)
  const filters        = useBrainStore((s) => s.filters)
  const setSearch        = useBrainStore((s) => s.setSearch)
  const toggleCategory   = useBrainStore((s) => s.toggleCategory)
  const toggleSubCategory = useBrainStore((s) => s.toggleSubCategory)
  const toggleStatus     = useBrainStore((s) => s.toggleStatus)
  const togglePerson     = useBrainStore((s) => s.togglePerson)
  const toggleTag        = useBrainStore((s) => s.toggleTag)
  const setTagMatchMode  = useBrainStore((s) => s.setTagMatchMode)
  const setSortBy        = useBrainStore((s) => s.setSortBy)
  const clearFilters     = useBrainStore((s) => s.clearFilters)
  const demoMode         = useBrainStore((s) => s.settings.demoMode)

  const specialDays          = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const setShowNewMilestone  = useBrainStore((s) => s.setShowNewMilestone)

  const personsFilter = useBrainStore((s) => s.filters.persons)
  const contacts     = useBrainStore((s) => s.contacts)

  const { saveRow } = useSheetSync()

  const [tab, setTab]                   = useState<SidebarTab>('stats')
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([])
  const [loadingQF, setLoadingQF]       = useState(false)
  const [savingQF, setSavingQF]         = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  // rowIndex → lineIndex being saved right now (optimistic spinner)
  const [saving, setSaving] = useState<Record<number, number | null>>({})

  const { expanded, toggle: toggleExpanded } = useExpandedRows()

  // Load quick filters when tab is shown
  useEffect(() => {
    if (tab !== 'filters' || demoMode) return
    setLoadingQF(true)
    fetchQuickFilters()
      .then(setQuickFilters)
      .finally(() => setLoadingQF(false))
  }, [tab, demoMode])

  /* ── Stats computations ────────────────────────────────────────────── */

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      const cat = r.category?.trim() || 'Uncategorized'
      counts[cat] = (counts[cat] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [rows])

  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      parseTags(r.tags).forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
  }, [rows])

  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {
      Done: 0, 'In Progress': 0, Pending: 0, Blocked: 0, 'In Review': 0,
    }
    for (const r of rows) {
      if (r.taskStatus && counts[r.taskStatus] !== undefined) {
        counts[r.taskStatus]++
      }
    }
    return Object.entries(counts).filter(([, v]) => v > 0)
  }, [rows])

  const enhancedCount = useMemo(() => rows.filter(r => r.rewritten).length, [rows])

  /* ── People ────────────────────────────────────────────────────────── */
  const peopleStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      parsePeople(r.people ?? '').forEach((name) => {
        counts[name] = (counts[name] || 0) + 1
      })
    }
    // Also include contacts that appear in entries
    contacts.forEach((c) => {
      if (!counts[c.name]) counts[c.name] = 0
    })
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
  }, [rows, contacts])

  /* ── Due Soon ──────────────────────────────────────────────────────── */

  const dueSoonRows = useMemo(() => {
    const today = new Date()
    const in7   = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const todayStr = today.toISOString().slice(0, 10)
    const in7Str   = in7.toISOString().slice(0, 10)
    return rows
      .filter(r => r.dueDate && r.dueDate >= todayStr && r.dueDate <= in7Str)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 20)
  }, [rows])

  const overdueRows = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return rows
      .filter(r => r.dueDate && r.dueDate < todayStr && r.taskStatus !== 'Done' && r.taskStatus !== 'Complete')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 10)
  }, [rows])

  /* ── All Tasks (Tasks tab) ─────────────────────────────────────────── */

  const taskRows = useMemo(() => {
    // Show entries that have action items or a taskStatus, excluding Done entries with no action items
    return rows
      .filter(r => r.actionItems?.trim() || r.taskStatus)
      .sort((a, b) => {
        // Entries with due dates come first
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        return 0
      })
  }, [rows])

  // Count of pending action items across all task rows (for badge)
  const pendingTaskCount = useMemo(() => {
    let n = 0
    for (const r of taskRows) {
      const items = parseActionItems(r.actionItems ?? '')
      n += items.filter(i => !i.done).length
    }
    return n
  }, [taskRows])

  /* ── Activity (last 30 days) ───────────────────────────────────────── */

  const activityData = useMemo(() => {
    const counts: Record<string, number> = {}
    const today  = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      counts[d.toISOString().slice(0, 10)] = 0
    }
    for (const r of rows) {
      const day = r.createdAt?.slice(0, 10)
      if (day && day in counts) counts[day]++
    }
    return Object.entries(counts).map(([date, count]) => ({ date, count }))
  }, [rows])

  const maxActivity = useMemo(() => Math.max(1, ...activityData.map(d => d.count)), [activityData])

  /* ── Quick Filters ─────────────────────────────────────────────────── */

  async function handleSaveFilter() {
    const name = newFilterName.trim()
    if (!name) { toast.error('Enter a name for this filter'); return }
    setSavingQF(true)
    try {
      const qf: QuickFilter = {
        name,
        search:        filters.search,
        categories:    filters.categories,
        subCategories: filters.subCategories,
        statuses:      filters.statuses,
        persons:       filters.persons,
        selectedTags:  filters.selectedTags,
        tagMatchMode:  filters.tagMatchMode,
        sortBy:        filters.sortBy,
      }
      await saveQuickFilter(qf)
      setQuickFilters(prev => {
        const exists = prev.findIndex(f => f.name.toLowerCase() === name.toLowerCase())
        return exists >= 0
          ? prev.map((f, i) => i === exists ? qf : f)
          : [...prev, qf]
      })
      setNewFilterName('')
      toast.success('Filter saved!')
    } catch {
      toast.error('Failed to save filter')
    } finally {
      setSavingQF(false)
    }
  }

  async function handleDeleteFilter(name: string) {
    try {
      await deleteQuickFilter(name)
      setQuickFilters(prev => prev.filter(f => f.name !== name))
      toast.success('Filter deleted')
    } catch {
      toast.error('Failed to delete filter')
    }
  }

  function handleApplyFilter(qf: QuickFilter) {
    clearFilters()
    setSearch(qf.search || '')
    qf.categories?.forEach(toggleCategory)
    qf.subCategories?.forEach(toggleSubCategory)
    qf.statuses?.forEach(toggleStatus)
    qf.persons?.forEach(togglePerson)
    qf.selectedTags?.forEach(toggleTag)
    if (qf.tagMatchMode) setTagMatchMode(qf.tagMatchMode)
    setSortBy((qf.sortBy || 'date-desc') as Parameters<typeof setSortBy>[0])
    toast.success(`Applied "${qf.name}"`)
    setShowSidebar(false)
  }

  /* ── Toggle individual action item ────────────────────────────────── */

  async function handleToggleTask(row: BrainRow, lineIndex: number) {
    setSaving(prev => ({ ...prev, [row._rowIndex]: lineIndex }))
    try {
      const newActionItems = toggleActionItem(row.actionItems ?? '', lineIndex)
      await saveRow(row._rowIndex, { actionItems: newActionItems }, 'Task toggle')
    } catch {
      // saveRow already shows a toast on error
    } finally {
      setSaving(prev => ({ ...prev, [row._rowIndex]: null }))
    }
  }

  /* ── Milestone gradient helper ───────────────────────────────────────── */
  function getMilestoneGradient(dateStr: string, isToday: boolean, isAnniversary: boolean) {
    if (isToday || isAnniversary) return 'from-rose-500 via-pink-500 to-fuchsia-500'
    const years = differenceInYears(new Date(), new Date(dateStr + 'T12:00:00'))
    if (years < 1) return 'from-violet-500 via-purple-500 to-indigo-500'
    if (years < 2) return 'from-indigo-500 via-blue-500 to-cyan-500'
    if (years < 5) return 'from-emerald-500 via-teal-500 to-green-500'
    return 'from-amber-500 via-orange-500 to-yellow-500'
  }

  function getElapsedShort(dateStr: string) {
    const now = new Date()
    const d   = new Date(dateStr + 'T12:00:00')
    const years  = differenceInYears(now, d)
    const months = differenceInMonths(now, d) % 12
    if (years === 0 && months === 0) return 'This month'
    if (years === 0) return `${months}mo ago`
    if (months === 0) return `${years}yr ago`
    return `${years}yr ${months}mo`
  }

  if (!showSidebar) return null

  const maxCatCount = Math.max(1, ...categoryStats.map(([, c]) => c))

  const statusColors: Record<string, string> = {
    'Done':        'bg-green-500',
    'In Progress': 'bg-blue-500',
    'Pending':     'bg-amber-500',
    'Blocked':     'bg-red-500',
    'In Review':   'bg-purple-500',
  }

  /* ── Shared row card for Due Soon + Tasks tabs ─────────────────────── */
  function RowCard({
    row,
    isOverdue = false,
  }: {
    row: BrainRow
    isOverdue?: boolean
  }) {
    const items    = parseActionItems(row.actionItems ?? '')
    const doneCount = items.filter(i => i.done).length
    const isExpanded = expanded.has(row._rowIndex)
    const savingIdx  = saving[row._rowIndex] ?? null

    return (
      <div className={cn(
        'border rounded-lg overflow-hidden',
        isOverdue
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-surface2 border-border',
      )}>
        {/* Entry header — click to open modal */}
        <button
          onClick={() => { openModal(row); setShowSidebar(false) }}
          className="w-full text-left px-2.5 pt-2 pb-1.5 hover:opacity-80 transition-opacity"
        >
          <p className="text-xs font-medium text-ink line-clamp-1">{row.title || 'Untitled'}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className={cn(
              'text-[10px] flex items-center gap-1',
              isOverdue ? 'text-red-500' : 'text-ink3',
            )}>
              {row.dueDate && (
                <>
                  <Clock className="w-2.5 h-2.5" />
                  {isOverdue ? 'Overdue · ' : ''}{formatDate(row.dueDate)}
                </>
              )}
              {!row.dueDate && row.taskStatus && (
                <span className="text-ink3">{row.taskStatus}</span>
              )}
            </p>
            {items.length > 0 && (
              <span className="text-[10px] text-ink3">{doneCount}/{items.length}</span>
            )}
          </div>
        </button>

        {/* Expand/collapse action items toggle */}
        {items.length > 0 && (
          <div className="px-2.5 pb-2">
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(row._rowIndex) }}
              className="text-[10px] text-brand hover:underline"
            >
              {isExpanded ? 'Hide tasks ▲' : `Show ${items.length} task${items.length !== 1 ? 's' : ''} ▼`}
            </button>
            {isExpanded && (
              <ActionItemList
                row={row}
                onToggle={handleToggleTask}
                savingIndex={savingIdx}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop — all screen sizes */}
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
        onClick={() => setShowSidebar(false)}
      />

      {/* Sidebar panel — always a fixed overlay, offset for nav rail on desktop */}
      <aside className={cn(
        'fixed z-40 inset-y-0 left-0 sm:left-14',
        'bg-surface border-r border-border flex flex-col',
        'w-[300px] shadow-xl',
        'animate-slideInLeft',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand/15 flex items-center justify-center">
              <BarChart2 className="w-3.5 h-3.5 text-brand" />
            </div>
            <span className="text-sm font-bold text-ink tracking-tight">Dashboard</span>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs — single scrollable row */}
        <div className="shrink-0 border-b border-border bg-surface">
          <div className="flex overflow-x-auto scrollbar-hide px-1 py-1 gap-0.5">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = tab === key
              const todayStr = new Date().toISOString().slice(0, 10)
              const todayMD  = todayStr.slice(5)
              const milestoneAlert = key === 'milestones' &&
                specialDays.some(d => d.date === todayStr || (d.date !== todayStr && d.date.slice(5) === todayMD))
              const taskBadge = key === 'tasks' && pendingTaskCount > 0

              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-brand/10 text-brand shadow-sm'
                      : 'text-ink3 hover:text-ink hover:bg-hover',
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                  {taskBadge && (
                    <span className="bg-brand text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                      {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                    </span>
                  )}
                  {milestoneAlert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── STATS ── */}
          {tab === 'stats' && (
            <div className="space-y-5">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total entries', value: rows.length,                                     color: 'text-ink',       bg: 'bg-surface2 border-border/60',                             dot: 'bg-ink3' },
                  { label: 'AI enhanced',   value: enhancedCount,                                   color: 'text-brand',     bg: 'bg-brand/5 border-brand/15',                               dot: 'bg-brand' },
                  { label: 'With tasks',    value: rows.filter(r => r.taskStatus).length,           color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200/50',     dot: 'bg-amber-500' },
                  { label: 'Completed',     value: rows.filter(r => r.taskStatus === 'Done').length, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/15 border-green-200/50', dot: 'bg-green-500' },
                ].map(({ label, value, color, bg, dot }) => (
                  <div key={label} className={cn('rounded-xl p-3 border flex flex-col gap-1', bg)}>
                    <div className={cn('text-2xl font-bold tracking-tight leading-none', color)}>{value}</div>
                    <div className="flex items-center gap-1.5">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                      <span className="text-[10px] text-ink3 font-medium">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {categoryStats.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2.5">Categories</p>
                  <div className="space-y-1.5">
                    {categoryStats.map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs text-ink w-24 truncate shrink-0">{cat}</span>
                        <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${(count / maxCatCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-ink3 w-5 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status breakdown */}
              {statusStats.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2.5">Task Status</p>
                  <div className="space-y-1.5">
                    {statusStats.map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', statusColors[status] || 'bg-ink3')} />
                        <span className="text-xs text-ink flex-1 truncate">{status}</span>
                        <span className="text-[10px] text-ink3">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top tags */}
              {tagStats.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wider mb-2.5">Top Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagStats.map(([tag, count]) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[10px] bg-surface2 border border-border rounded-full px-2 py-0.5 text-ink2"
                      >
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        {tag}
                        <span className="text-ink3">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DUE SOON ── */}
          {tab === 'due' && (
            <div className="space-y-4">
              {overdueRows.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-red-500 uppercase tracking-wide mb-2">
                    Overdue ({overdueRows.length})
                  </p>
                  <div className="space-y-2">
                    {overdueRows.map(row => (
                      <RowCard key={row._rowIndex} row={row} isOverdue />
                    ))}
                  </div>
                </div>
              )}

              {dueSoonRows.length > 0 ? (
                <div>
                  <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">
                    Next 7 days ({dueSoonRows.length})
                  </p>
                  <div className="space-y-2">
                    {dueSoonRows.map(row => (
                      <RowCard key={row._rowIndex} row={row} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                  <p className="text-sm text-ink2">Nothing due in the next 7 days</p>
                  {overdueRows.length === 0 && (
                    <p className="text-xs text-ink3 mt-1">You're all caught up!</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ALL TASKS ── */}
          {tab === 'tasks' && (
            <div className="space-y-4">
              <p className="text-xs text-ink2">
                All entries with tasks — click a task to toggle it complete.
              </p>

              {taskRows.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                  <p className="text-sm text-ink2">No tasks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {taskRows.map(row => {
                    const items    = parseActionItems(row.actionItems ?? '')
                    const doneCount = items.filter(i => i.done).length
                    const savingIdx = saving[row._rowIndex] ?? null
                    const isExpanded = expanded.has(row._rowIndex)

                    return (
                      <div key={row._rowIndex} className="border border-border rounded-lg overflow-hidden bg-surface2">
                        {/* Header */}
                        <div className="flex items-start gap-1.5 px-2.5 pt-2 pb-1">
                          <button
                            onClick={() => { openModal(row); setShowSidebar(false) }}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-xs font-medium text-ink line-clamp-1">{row.title || 'Untitled'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {row.dueDate && (
                                <span className="text-[10px] text-ink3 flex items-center gap-0.5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDate(row.dueDate)}
                                </span>
                              )}
                              {row.taskStatus && (
                                <span className="text-[10px] text-ink3">{row.taskStatus}</span>
                              )}
                            </div>
                          </button>
                          {items.length > 0 && (
                            <span className={cn(
                              'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                              doneCount === items.length
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-surface text-ink3',
                            )}>
                              {doneCount}/{items.length}
                            </span>
                          )}
                        </div>

                        {/* Action items — always visible in Tasks tab */}
                        {items.length > 0 ? (
                          <div className="px-2.5 pb-2">
                            {/* Show first 3 or all if expanded */}
                            <ActionItemList
                              row={{ ...row, actionItems: items.length <= 3 || isExpanded
                                ? row.actionItems
                                : items.slice(0, 3).map(
                                    (item) => row.actionItems!.split('\n')[item.lineIndex]
                                  ).join('\n')
                              }}
                              onToggle={handleToggleTask}
                              savingIndex={savingIdx}
                            />
                            {items.length > 3 && (
                              <button
                                onClick={() => toggleExpanded(row._rowIndex)}
                                className="text-[10px] text-brand hover:underline mt-1 ml-1"
                              >
                                {isExpanded ? 'Show less ▲' : `+${items.length - 3} more ▼`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="px-2.5 pb-2">
                            <span className="text-[10px] text-ink3 italic">Entry-level task</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {tab === 'activity' && (
            <div className="space-y-4">
              <p className="text-xs text-ink2">Entries created per day (last 30 days)</p>

              {/* Sparkline-style bar chart */}
              <div className="flex items-end gap-0.5 h-20">
                {activityData.map(({ date, count }) => (
                  <div
                    key={date}
                    className="flex-1 flex flex-col items-center justify-end group relative"
                    title={`${date}: ${count} entr${count === 1 ? 'y' : 'ies'}`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        count > 0 ? 'bg-brand' : 'bg-surface2',
                      )}
                      style={{ height: `${(count / maxActivity) * 100}%`, minHeight: count > 0 ? '3px' : '2px' }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                      {count}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week labels */}
              <div className="flex justify-between text-[9px] text-ink3">
                <span>30d ago</span>
                <span>15d ago</span>
                <span>Today</span>
              </div>

              {/* Activity summary */}
              <div className="bg-surface2 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink2">This week</span>
                  <span className="font-medium text-ink">
                    {activityData.slice(-7).reduce((s, d) => s + d.count, 0)} entries
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink2">This month</span>
                  <span className="font-medium text-ink">
                    {activityData.reduce((s, d) => s + d.count, 0)} entries
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink2">Most active day</span>
                  <span className="font-medium text-ink">
                    {activityData.reduce((best, d) => d.count > best.count ? d : best, { date: '', count: 0 }).date || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── QUICK FILTERS ── */}
          {tab === 'filters' && (
            <div className="space-y-4">
              <p className="text-xs text-ink2">Save your current filter settings as a preset for quick access. Presets are stored in your Google Sheet's Config tab.</p>

              {/* Save current filter */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide">Save current filter</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                    placeholder="Filter name…"
                    className="flex-1 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand/40"
                  />
                  <button
                    onClick={handleSaveFilter}
                    disabled={savingQF || !newFilterName.trim()}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {savingQF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Save
                  </button>
                </div>
                {/* Current filter preview */}
                <div className="text-[10px] text-ink3 space-y-0.5">
                  {filters.search && <p>Search: "{filters.search}"</p>}
                  {filters.categories.length > 0 && <p>Category: {filters.categories.join(', ')}</p>}
                  {filters.statuses.length > 0 && <p>Status: {filters.statuses.join(', ')}</p>}
                  {filters.persons.length > 0 && <p>People: {filters.persons.join(', ')}</p>}
                  {filters.selectedTags.length > 0 && <p>Tags: {filters.selectedTags.join(', ')}</p>}
                  {!filters.search && !filters.categories.length && !filters.statuses.length && !filters.selectedTags.length && !filters.persons.length && (
                    <p className="text-ink3 italic">No filters active</p>
                  )}
                </div>
              </div>

              {/* Saved presets */}
              <div>
                <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Saved presets</p>
                {demoMode ? (
                  <p className="text-xs text-ink3 italic">Not available in demo mode</p>
                ) : loadingQF ? (
                  <div className="flex items-center gap-2 text-xs text-ink3 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading…
                  </div>
                ) : quickFilters.length === 0 ? (
                  <p className="text-xs text-ink3 py-2">No saved presets yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {quickFilters.map((qf) => (
                      <div key={qf.name} className="flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-lg group">
                        <button
                          onClick={() => handleApplyFilter(qf)}
                          className="flex-1 text-left min-w-0"
                        >
                          <p className="text-xs font-medium text-ink truncate">{qf.name}</p>
                          <p className="text-[10px] text-ink3 truncate">
                            {[
                              qf.categories?.join(', '),
                              qf.statuses?.join(', '),
                              qf.search && `"${qf.search}"`,
                            ].filter(Boolean).join(' · ') || 'All entries'}
                          </p>
                        </button>
                        <button
                          onClick={() => handleApplyFilter(qf)}
                          className="shrink-0 p-1 rounded hover:bg-brand/10 text-brand opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Apply filter"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFilter(qf.name)}
                          className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-ink3 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PEOPLE ── */}
          {tab === 'people' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">People</p>
                  <p className="text-[11px] text-ink3">{peopleStats.length} contact{peopleStats.length !== 1 ? 's' : ''} tagged in entries</p>
                </div>
                {personsFilter.length > 0 && (
                  <button
                    onClick={() => personsFilter.forEach((p) => togglePerson(p))}
                    className="flex items-center gap-1 text-xs text-brand hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {personsFilter.length > 0 && (
                <div className="bg-brand/5 border border-brand/15 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-brand shrink-0" />
                  <p className="text-xs text-brand font-medium flex-1">Filtering: {personsFilter.join(', ')}</p>
                </div>
              )}

              {peopleStats.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 text-ink3 opacity-40" />
                  <p className="text-sm text-ink2">No contacts yet</p>
                  <p className="text-xs text-ink3 mt-1">Open an entry and add people in the People section.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {peopleStats.map(([name, count]) => {
                    const isActive = personsFilter.includes(name)
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          togglePerson(name)
                          setShowSidebar(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
                          isActive
                            ? 'bg-brand/10 border-brand/30 text-brand'
                            : 'bg-surface2 border-border hover:border-brand/30 hover:bg-brand/5 text-ink',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                          isActive ? 'bg-brand text-white' : 'bg-brand/15 text-brand',
                        )}>
                          {name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[10px] text-ink3">{count} {count === 1 ? 'entry' : 'entries'}</p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-brand shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MILESTONES ── */}
          {tab === 'milestones' && (() => {
            const today   = new Date().toISOString().slice(0, 10)
            const todayMD = today.slice(5)
            const sorted  = [...specialDays].sort((a, b) => {
              // anniversaries/today first, then by date desc
              const aSpec = a.date === today || a.date.slice(5) === todayMD
              const bSpec = b.date === today || b.date.slice(5) === todayMD
              if (aSpec !== bSpec) return aSpec ? -1 : 1
              return b.date.localeCompare(a.date)
            })
            const isToday       = (d: string) => d === today
            const isAnniversary = (d: string) => d !== today && d.slice(5) === todayMD
            return (
              <div className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">✨ Milestones</p>
                    <p className="text-[10px] text-ink3">{sorted.length} saved {sorted.length === 1 ? 'memory' : 'memories'}</p>
                  </div>
                  <button
                    onClick={() => { setShowNewMilestone(true); setShowSidebar(false) }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>

                {/* Empty state */}
                {sorted.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🌱</div>
                    <p className="text-sm font-medium text-ink2 mb-1">No milestones yet</p>
                    <p className="text-xs text-ink3 mb-4">Save special moments — visa approvals, anniversaries, achievements…</p>
                    <button
                      onClick={() => { setShowNewMilestone(true); setShowSidebar(false) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-xl hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3 h-3" /> Add first milestone
                    </button>
                  </div>
                )}

                {/* Milestone cards */}
                {sorted.map(day => {
                  const highlight  = isToday(day.date) || isAnniversary(day.date)
                  const gradient   = getMilestoneGradient(day.date, isToday(day.date), isAnniversary(day.date))
                  const elapsed    = getElapsedShort(day.date)
                  const displayEmoji = day.emoji || '✨'
                  return (
                    <button
                      key={day.id}
                      onClick={() => { setSelectedMilestone(day); setShowSidebar(false) }}
                      className="w-full text-left group"
                    >
                      <div className={cn(
                        'relative rounded-2xl overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]',
                        'shadow-md hover:shadow-lg',
                      )}>
                        {/* Gradient background */}
                        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', gradient)} />
                        {/* Shimmer on special days */}
                        {highlight && <div className="milestone-shimmer absolute inset-0" />}

                        {/* Card content */}
                        <div className="relative z-10 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-3xl leading-none drop-shadow-md select-none mt-0.5">
                              {displayEmoji}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors mt-1 shrink-0" />
                          </div>

                          <p className="mt-2.5 text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-sm">
                            {day.title}
                          </p>

                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-white/70 font-medium">
                              {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-white/60">·</span>
                            <span className="text-[10px] text-white/80 font-semibold">{elapsed}</span>
                          </div>

                          {/* Badges */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {isToday(day.date) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold backdrop-blur-sm">
                                🎉 Today!
                              </span>
                            )}
                            {isAnniversary(day.date) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold backdrop-blur-sm animate-pulse-soft">
                                🎂 Anniversary!
                              </span>
                            )}
                          </div>

                          {/* Short description preview */}
                          {day.description && (
                            <p className="mt-2 text-[10px] text-white/70 line-clamp-2 italic">
                              {day.description.slice(0, 80)}{day.description.length > 80 ? '…' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })()}

        </div>

        {/* Build version footer */}
        <div className="shrink-0 px-4 py-2.5 border-t border-border bg-surface2/40 flex items-center justify-between">
          <p className="text-[10px] text-ink3 tabular-nums">
            <span className="font-semibold text-ink2">v{__BUILD_TIME__.slice(0, 10)}</span>
            &nbsp;·&nbsp;
            <span className="font-mono">{__COMMIT_SHA__.slice(0, 7)}</span>
          </p>
          <span className="text-[9px] text-ink3 uppercase tracking-widest font-medium">Brain 2.0</span>
        </div>
      </aside>
    </>
  )
}
