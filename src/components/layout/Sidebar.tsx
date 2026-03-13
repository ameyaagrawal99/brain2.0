import { useEffect, useMemo, useState } from 'react'
import {
  BarChart2, Calendar, Filter, X, Clock, Tag, CheckCircle,
  Loader2, Plus, Trash2, BookmarkCheck, TrendingUp, ListChecks,
  Square, CheckSquare2, Star,
} from 'lucide-react'
import { formatDistance } from 'date-fns'
import { useBrainStore } from '@/store/useBrainStore'
import { parseTags, formatDate, cn, parseActionItems, toggleActionItem } from '@/lib/utils'
import { fetchQuickFilters, saveQuickFilter, deleteQuickFilter } from '@/lib/sheetsConfig'
import { useSheetSync } from '@/hooks/useSheetSync'
import type { QuickFilter } from '@/lib/sheetsConfig'
import type { BrainRow } from '@/types/sheet'
import toast from 'react-hot-toast'

type SidebarTab = 'stats' | 'due' | 'tasks' | 'activity' | 'filters' | 'milestones'

const TABS: { key: SidebarTab; label: string; icon: typeof BarChart2 }[] = [
  { key: 'stats',      label: 'Stats',      icon: BarChart2 },
  { key: 'due',        label: 'Due Soon',   icon: Calendar },
  { key: 'tasks',      label: 'Tasks',      icon: ListChecks },
  { key: 'activity',   label: 'Activity',   icon: TrendingUp },
  { key: 'filters',    label: 'Filters',    icon: Filter },
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
  const setSearch      = useBrainStore((s) => s.setSearch)
  const setCategory    = useBrainStore((s) => s.setCategory)
  const setSubCategory = useBrainStore((s) => s.setSubCategory)
  const setStatus      = useBrainStore((s) => s.setStatus)
  const setSortBy      = useBrainStore((s) => s.setSortBy)
  const clearFilters   = useBrainStore((s) => s.clearFilters)
  const demoMode       = useBrainStore((s) => s.settings.demoMode)

  const specialDays = useBrainStore((s) => s.specialDays)

  const { saveRow, createSpecialDay, removeSpecialDay } = useSheetSync()

  const [tab, setTab]                   = useState<SidebarTab>('stats')
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([])
  const [loadingQF, setLoadingQF]       = useState(false)
  const [savingQF, setSavingQF]         = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  // rowIndex → lineIndex being saved right now (optimistic spinner)
  const [saving, setSaving] = useState<Record<number, number | null>>({})

  // Milestones add-form state
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [msTitle, setMsTitle]   = useState('')
  const [msDate, setMsDate]     = useState('')
  const [msEmoji, setMsEmoji]   = useState('')
  const [msDesc, setMsDesc]     = useState('')
  const [savingMs, setSavingMs] = useState(false)

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
        search:      filters.search,
        category:    filters.category,
        subCategory: filters.subCategory,
        status:      filters.status,
        selectedTags: filters.selectedTags,
        sortBy:      filters.sortBy,
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
    setCategory(qf.category || '')
    setSubCategory(qf.subCategory || '')
    setStatus(qf.status || '')
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

  /* ── Milestones ─────────────────────────────────────────────────────── */

  async function handleSaveMilestone() {
    const title = msTitle.trim()
    const date  = msDate.trim()
    if (!title) { toast.error('Enter a title for the milestone'); return }
    if (!date)  { toast.error('Pick a date for the milestone'); return }
    setSavingMs(true)
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      await createSpecialDay({
        id,
        title,
        date,
        emoji: msEmoji.trim() || undefined,
        description: msDesc.trim() || undefined,
      })
      setMsTitle('')
      setMsDate('')
      setMsEmoji('')
      setMsDesc('')
      setShowAddMilestone(false)
    } catch {
      // toast already shown by createSpecialDay
    } finally {
      setSavingMs(false)
    }
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
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 sm:hidden"
        onClick={() => setShowSidebar(false)}
      />

      {/* Sidebar panel */}
      <aside className={cn(
        'fixed sm:relative z-40 sm:z-auto',
        'bg-surface border-r border-border flex flex-col',
        'w-72 h-full sm:h-auto sm:min-h-0',
        'inset-y-0 left-0',
        'sm:flex-shrink-0',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-ink">Dashboard</span>
          <button
            onClick={() => setShowSidebar(false)}
            className="sm:hidden w-7 h-7 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors whitespace-nowrap flex-1',
                tab === key
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-ink3 hover:text-ink'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {/* Pending tasks badge on Tasks tab */}
              {key === 'tasks' && pendingTaskCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── STATS ── */}
          {tab === 'stats' && (
            <div className="space-y-5">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total', value: rows.length, color: 'text-ink' },
                  { label: 'Enhanced', value: enhancedCount, color: 'text-brand' },
                  { label: 'Tasks', value: rows.filter(r => r.taskStatus).length, color: 'text-amber-500' },
                  { label: 'Done', value: rows.filter(r => r.taskStatus === 'Done').length, color: 'text-green-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-surface2 rounded-xl p-3 text-center">
                    <div className={cn('text-xl font-bold', color)}>{value}</div>
                    <div className="text-[10px] text-ink3 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Category breakdown */}
              {categoryStats.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Categories</p>
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
                  <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Task Status</p>
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
                  <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Top Tags</p>
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
                  {filters.category && <p>Category: {filters.category}</p>}
                  {filters.status && <p>Status: {filters.status}</p>}
                  {filters.selectedTags.length > 0 && <p>Tags: {filters.selectedTags.join(', ')}</p>}
                  {!filters.search && !filters.category && !filters.status && !filters.selectedTags.length && (
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
                            {[qf.category, qf.status, qf.search && `"${qf.search}"`].filter(Boolean).join(' · ') || 'All entries'}
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

          {/* ── MILESTONES ── */}
          {tab === 'milestones' && (() => {
            const today   = new Date().toISOString().slice(0, 10)
            const todayMD = today.slice(5)
            const sorted  = [...specialDays].sort((a, b) => b.date.localeCompare(a.date))
            const isToday       = (d: string) => d === today
            const isAnniversary = (d: string) => d !== today && d.slice(5) === todayMD
            return (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink2 uppercase tracking-wide">Milestones</p>
                  <button
                    onClick={() => setShowAddMilestone(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {/* Add form */}
                {showAddMilestone && (
                  <div className="bg-surface2 border border-border rounded-xl p-3 space-y-2 animate-fade-in">
                    <input
                      type="text"
                      placeholder="Title (e.g. Visa approved!)"
                      value={msTitle}
                      onChange={e => setMsTitle(e.target.value)}
                      className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={msDate}
                        onChange={e => setMsDate(e.target.value)}
                        className="flex-1 text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                      <input
                        type="text"
                        placeholder="Emoji"
                        value={msEmoji}
                        onChange={e => setMsEmoji(e.target.value)}
                        maxLength={4}
                        className="w-16 text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-ink placeholder:text-ink3 text-center focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={msDesc}
                      onChange={e => setMsDesc(e.target.value)}
                      className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveMilestone}
                        disabled={savingMs}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-brand text-white rounded-lg py-1.5 hover:bg-brand/90 disabled:opacity-60 transition-colors"
                      >
                        {savingMs ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={() => setShowAddMilestone(false)}
                        className="px-3 text-xs text-ink3 hover:text-ink transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Milestone list */}
                {sorted.length === 0 && !showAddMilestone && (
                  <p className="text-xs text-ink3 italic text-center py-4">
                    No milestones yet. Add your first special day!
                  </p>
                )}

                {sorted.map(day => {
                  const highlight = isToday(day.date) || isAnniversary(day.date)
                  const dateObj = new Date(day.date + 'T12:00:00')
                  const elapsed = formatDistance(dateObj, new Date(), { addSuffix: true })
                  return (
                    <div
                      key={day.id}
                      className={cn(
                        'border rounded-xl p-3 transition-colors',
                        highlight
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                          : 'bg-surface2 border-border',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {day.emoji && <span className="text-base shrink-0">{day.emoji}</span>}
                          <p className="text-xs font-semibold text-ink leading-snug truncate">{day.title}</p>
                        </div>
                        <button
                          onClick={() => removeSpecialDay(day.id)}
                          className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-ink3 hover:text-red-500 transition-colors"
                          title="Remove milestone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-ink3 mt-0.5">{formatDate(day.date)} · {elapsed}</p>
                      {day.description && (
                        <p className="text-[10px] text-ink2 mt-1 italic line-clamp-2">"{day.description}"</p>
                      )}
                      {isToday(day.date) && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 rounded-full px-2 py-0.5">
                          🎉 Today!
                        </span>
                      )}
                      {isAnniversary(day.date) && (
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 rounded-full px-2 py-0.5">
                          🎂 Anniversary!
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

        </div>
      </aside>
    </>
  )
}
