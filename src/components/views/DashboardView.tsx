import { useMemo } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { parseTags, cn } from '@/lib/utils'
import { parsePeople } from '@/lib/contacts'
import { aggregateSentiment, EMOTION_META, type SentimentFilter } from '@/lib/sentiment'
import { addLocalDays, monthDay, toLocalISODate } from '@/lib/date'
import {
  CheckCircle2, Clock, AlertTriangle, CalendarDays, Star,
  Tag, Zap, RefreshCw, Plus, Smile, Meh, Frown,
  ArrowRight, Target, Layers3,
} from 'lucide-react'

/* ── Helpers ─────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function daysFromNow(iso: string) {
  const diff = Math.round(
    (new Date(iso + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0)  return `${Math.abs(diff)}d ago`
  return `in ${diff}d`
}

const MILESTONE_COLORS = [
  'from-rose-500 to-pink-500',
  'from-violet-500 to-fuchsia-500',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
]

const CAT_ACCENT_COLORS = [
  'bg-brand',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-blue-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-fuchsia-500',
]

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: number | string; sub?: string
  icon: typeof CheckCircle2; accent: string
}) {
  return (
    <div className="premium-surface rounded-2xl px-4 py-4 flex items-start gap-3 hover:-translate-y-0.5 transition-transform">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink leading-none">{value}</p>
        <p className="text-xs font-medium text-ink2 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-ink3 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FocusSummary({
  overdueCount,
  dueTodayCount,
  dueSoonCount,
  activeCount,
  onOpenBoard,
  onNewEntry,
}: {
  overdueCount: number
  dueTodayCount: number
  dueSoonCount: number
  activeCount: number
  onOpenBoard: () => void
  onNewEntry: () => void
}) {
  const focusItems = [
    { label: 'Overdue', value: overdueCount, tone: overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ink2' },
    { label: 'Due today', value: dueTodayCount, tone: dueTodayCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink2' },
    { label: 'Next 7 days', value: dueSoonCount, tone: 'text-blue-600 dark:text-blue-400' },
    { label: 'Active', value: activeCount, tone: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div className="premium-surface rounded-3xl px-4 sm:px-5 py-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 sm:w-64">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Today’s focus</p>
            <p className="text-xs text-ink3 mt-0.5">A compact command center for tasks and new captures.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {focusItems.map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface2 border border-border px-3 py-2.5">
              <p className={cn('text-xl font-bold tabular-nums leading-none', item.tone)}>{item.value}</p>
              <p className="text-[11px] text-ink3 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex sm:flex-col gap-2 sm:w-36">
          <button
            onClick={onOpenBoard}
            className="flex-1 sm:flex-none h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-ink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Board <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNewEntry}
            className="flex-1 sm:flex-none h-9 inline-flex items-center justify-center gap-1.5 rounded-xl premium-control text-xs font-semibold text-ink"
          >
            Capture <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Section wrapper ─────────────────────────────────────────────── */
function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ── Main DashboardView ──────────────────────────────────────────── */
export function DashboardView() {
  const rows                 = useBrainStore((s) => s.rows)
  const specialDays          = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const setShowNewMilestone  = useBrainStore((s) => s.setShowNewMilestone)
  const setShowNewRow        = useBrainStore((s) => s.setShowNewRow)
  const openModal            = useBrainStore((s) => s.openModal)
  const setViewMode          = useBrainStore((s) => s.setViewMode)
  const setSentimentFilter   = useBrainStore((s) => s.setSentimentFilter)
  const sentimentFilter      = useBrainStore((s) => s.sentimentFilter)

  function applySentimentFilter(f: SentimentFilter) {
    setSentimentFilter(f)
    setViewMode('card')
  }

  const { refresh } = useSheetSync()

  const today   = toLocalISODate()
  const todayMD = monthDay(today)

  /* ── Computed stats ──────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total    = rows.length
    const ts       = (r: typeof rows[0]) => (r.taskStatus ?? '').toLowerCase()
    const done     = rows.filter((r) => { const s = ts(r); return s.includes('done') || s.includes('complete') }).length
    const active   = rows.filter((r) => { const s = ts(r); return s.includes('progress') || s.includes('review') }).length
    const pending  = rows.filter((r) => ts(r) === 'pending').length
    const overdue  = rows.filter((r) => r.dueDate && r.dueDate < today && !ts(r).includes('done') && !ts(r).includes('complete')).length
    const dueToday = rows.filter((r) => r.dueDate === today && !ts(r).includes('done') && !ts(r).includes('complete')).length
    const enhanced = rows.filter((r) => r.rewritten).length
    const withStatus = rows.filter(r => r.taskStatus).length
    const completion = withStatus > 0 ? Math.round((done / withStatus) * 100) : 0
    return { total, done, active, pending, overdue, dueToday, enhanced, completion }
  }, [rows, today])

  /* ── Due soon ────────────────────────────────────────────────── */
  const dueSoon = useMemo(() => {
    const in7 = toLocalISODate(addLocalDays(new Date(), 7))
    return rows
      .filter((r) => {
        const s = (r.taskStatus ?? '').toLowerCase()
        return r.dueDate && r.dueDate >= today && r.dueDate <= in7 && !s.includes('done') && !s.includes('complete')
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6)
  }, [rows, today])

  const overdue = useMemo(() => rows
    .filter((r) => {
      const s = (r.taskStatus ?? '').toLowerCase()
      return r.dueDate && r.dueDate < today && !s.includes('done') && !s.includes('complete')
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 4),
  [rows, today])

  /* ── Categories ──────────────────────────────────────────────── */
  const catStats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) {
      const cat = r.category?.trim() || 'Uncategorized'
      counts[cat] = (counts[cat] || 0) + 1
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const max = entries[0]?.[1] ?? 1
    return entries.map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
  }, [rows])

  /* ── Top tags ────────────────────────────────────────────────── */
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) parseTags(r.tags).forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
  }, [rows])

  /* ── Top people ──────────────────────────────────────────────── */
  const topPeople = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of rows) parsePeople(r.people ?? '').forEach((n) => { counts[n] = (counts[n] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [rows])

  /* ── Milestones ──────────────────────────────────────────────── */
  const { todayMs, upcoming, past } = useMemo(() => {
    const todayMs   = specialDays.filter(d => d.date === today || (d.date !== today && d.date.slice(5) === todayMD))
    const upcoming  = specialDays
      .filter(d => d.date > today && d.date.slice(5) !== todayMD)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
    const past = specialDays
      .filter(d => d.date < today && d.date.slice(5) !== todayMD)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)
    return { todayMs, upcoming, past }
  }, [specialDays, today, todayMD])

  /* ── Recent (last 7 days) ────────────────────────────────────── */
  const recent = useMemo(() => {
    const ago7 = toLocalISODate(addLocalDays(new Date(), -7))
    return rows
      .filter(r => r.createdAt && r.createdAt >= ago7)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 5)
  }, [rows])

  /* ── Sentiment ───────────────────────────────────────────────── */
  const sentiment = useMemo(() => {
    const texts = rows.map((r) =>
      [r.title, r.original, r.rewritten, r.actionItems].filter(Boolean).join(' '),
    )
    return aggregateSentiment(texts)
  }, [rows])

  const fullDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-24">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink">{greeting()}</h1>
            <p className="text-sm text-ink3 mt-0.5">{fullDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh().catch(() => {})}
              className="w-8 h-8 rounded-xl border border-border bg-surface flex items-center justify-center text-ink3 hover:text-ink hover:bg-hover transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowNewRow(true)}
              className="flex items-center gap-1.5 h-8 px-3 bg-brand text-white text-xs font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New entry</span>
            </button>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total entries"  value={stats.total}   icon={Layers3}      accent="bg-brand" sub={`${stats.enhanced} enhanced`} />
          <StatCard label="Done"           value={stats.done}    icon={CheckCircle2} accent="bg-emerald-500" sub={stats.completion > 0 ? `${stats.completion}% completion` : undefined} />
          <StatCard label="In progress"    value={stats.active}  icon={Clock}        accent="bg-blue-500"   sub={stats.pending > 0 ? `${stats.pending} pending` : undefined} />
          <StatCard label="Overdue"        value={stats.overdue} icon={AlertTriangle} accent={stats.overdue > 0 ? 'bg-rose-500' : 'bg-ink3'} />
        </div>

        <FocusSummary
          overdueCount={stats.overdue}
          dueTodayCount={stats.dueToday}
          dueSoonCount={dueSoon.length}
          activeCount={stats.active}
          onOpenBoard={() => setViewMode('board')}
          onNewEntry={() => setShowNewRow(true)}
        />

        {/* ── Progress bar ───────────────────────────────────── */}
        {stats.completion > 0 && (
          <div className="mb-8 premium-surface rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink2">Overall completion</span>
              <span className="text-sm font-bold text-brand">{stats.completion}%</span>
            </div>
            <div className="h-2 bg-surface2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${stats.completion}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Today's milestones ─────────────────────────────── */}
        {todayMs.length > 0 && (
          <div className="mb-8">
            {todayMs.map((ms, i) => {
              const isAnni = ms.date !== today && ms.date.slice(5) === todayMD
              return (
                <button
                  key={ms.id}
                  onClick={() => setSelectedMilestone(ms)}
                  className={cn(
                    'w-full relative overflow-hidden rounded-2xl p-5 text-left mb-3 last:mb-0',
                    'bg-gradient-to-r text-white shadow-lg hover:opacity-95 transition-opacity',
                    MILESTONE_COLORS[i % MILESTONE_COLORS.length],
                  )}
                >
                  <div className="milestone-shimmer absolute inset-0 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{isAnni ? '🎂' : '🎉'}</span>
                      <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">
                        {isAnni ? 'Anniversary' : 'Today'}
                      </span>
                    </div>
                    <p className="text-lg font-bold leading-snug">{ms.title}</p>
                    {ms.description && <p className="text-sm opacity-80 mt-0.5 line-clamp-1">{ms.description}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Two-column layout ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Milestones section */}
            <Section
              title="Milestones"
              action={
                <button
                  onClick={() => setShowNewMilestone(true)}
                  className="flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              }
            >
              {specialDays.length === 0 ? (
                <div className="bg-surface border border-border rounded-2xl p-6 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-ink3 opacity-40" />
                  <p className="text-sm font-medium text-ink2">No milestones yet</p>
                  <p className="text-xs text-ink3 mt-0.5 mb-3">Track birthdays, anniversaries, or special dates</p>
                  <button
                    onClick={() => setShowNewMilestone(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-brand font-medium border border-brand/30 rounded-lg px-3 py-1.5 hover:bg-brand/5 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add milestone
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wider mb-1.5">Upcoming</p>
                      {upcoming.map((ms, i) => (
                        <button
                          key={ms.id}
                          onClick={() => setSelectedMilestone(ms)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl hover:border-brand/30 hover:bg-brand/3 transition-all text-left mb-1.5 last:mb-0"
                        >
                          <div className={cn('w-2 h-8 rounded-full shrink-0 bg-gradient-to-b', MILESTONE_COLORS[i % MILESTONE_COLORS.length])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{ms.title}</p>
                            <p className="text-xs text-ink3">{fmtDate(ms.date)}</p>
                          </div>
                          <span className="text-[11px] font-medium text-brand shrink-0">{daysFromNow(ms.date)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {past.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wider mb-1.5 mt-3">Past</p>
                      {past.map((ms, i) => (
                        <button
                          key={ms.id}
                          onClick={() => setSelectedMilestone(ms)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl hover:border-brand/30 hover:bg-brand/3 transition-all text-left mb-1.5 last:mb-0 opacity-60"
                        >
                          <div className={cn('w-2 h-8 rounded-full shrink-0 bg-gradient-to-b', MILESTONE_COLORS[i % MILESTONE_COLORS.length])} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{ms.title}</p>
                            <p className="text-xs text-ink3">{fmtDate(ms.date)}</p>
                          </div>
                          <span className="text-[11px] text-ink3 shrink-0">{daysFromNow(ms.date)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {specialDays.length > (upcoming.length + past.length + todayMs.length) && (
                    <p className="text-xs text-ink3 text-center pt-1">
                      +{specialDays.length - upcoming.length - past.length - todayMs.length} more
                    </p>
                  )}
                </div>
              )}
            </Section>

            {/* Due soon + overdue */}
            {(dueSoon.length > 0 || overdue.length > 0) && (
              <Section title="Due & Overdue">
                {overdue.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider mb-1.5">Overdue</p>
                    <div className="space-y-1.5">
                      {overdue.map((r) => (
                        <button
                          key={r._rowIndex}
                          onClick={() => openModal(r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl hover:bg-rose-500/10 transition-colors text-left"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink line-clamp-1 break-all">{r.title}</p>
                            <p className="text-xs text-rose-500">{daysFromNow(r.dueDate)}</p>
                          </div>
                          {r.category && (
                            <span className="text-[10px] text-ink3 bg-surface2 px-1.5 py-0.5 rounded shrink-0">{r.category}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {dueSoon.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wider mb-1.5">Due this week</p>
                    <div className="space-y-1.5">
                      {dueSoon.map((r) => (
                        <button
                          key={r._rowIndex}
                          onClick={() => openModal(r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface border border-border rounded-xl hover:bg-hover transition-colors text-left"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-brand shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink line-clamp-1 break-all">{r.title}</p>
                            <p className="text-xs text-ink3">{daysFromNow(r.dueDate)}</p>
                          </div>
                          {r.taskStatus && (
                            <span className="text-[10px] text-ink3 bg-surface2 px-1.5 py-0.5 rounded shrink-0 capitalize">{r.taskStatus}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Recent entries */}
            {recent.length > 0 && (
              <Section title="Added this week">
                <div className="space-y-1.5">
                  {recent.map((r) => (
                    <button
                      key={r._rowIndex}
                      onClick={() => openModal(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface border border-border rounded-xl hover:bg-hover transition-colors text-left"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{r.title || '(no title)'}</p>
                        <p className="text-[11px] text-ink3">{r.category || 'Uncategorized'}</p>
                      </div>
                      {r.taskStatus && (
                        <span className="text-[10px] text-ink3 bg-surface2 px-1.5 py-0.5 rounded shrink-0 capitalize">{r.taskStatus}</span>
                      )}
                    </button>
                  ))}
                </div>
              </Section>
            )}

          </div>

          {/* Right column (1/3 width) */}
          <div className="space-y-6">

            {/* Sentiment & Emotions */}
            {rows.length > 0 && (() => {
              const toneRows = [
                { label: 'Positive' as const, count: sentiment.positiveCount, pct: sentiment.positivePct, bar: 'bg-emerald-500', icon: <Smile className="w-3 h-3" /> },
                { label: 'Neutral'  as const, count: sentiment.neutralCount,  pct: sentiment.neutralPct,  bar: 'bg-amber-400',  icon: <Meh  className="w-3 h-3" /> },
                { label: 'Negative' as const, count: sentiment.negativeCount, pct: sentiment.negativePct, bar: 'bg-rose-500',   icon: <Frown className="w-3 h-3" /> },
              ]
              const maxEmotionPct = sentiment.emotions[0]?.pct || 1

              return (
                <Section title="Sentiment & Emotions">
                  <div className="bg-surface border border-border rounded-2xl overflow-hidden">

                    {/* Header strip — overall + gauge */}
                    <div className="px-4 pt-3.5 pb-3 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {sentiment.overall === 'Positive' && <Smile className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {sentiment.overall === 'Neutral'  && <Meh   className="w-4 h-4 text-amber-500  shrink-0" />}
                          {sentiment.overall === 'Negative' && <Frown className="w-4 h-4 text-rose-500   shrink-0" />}
                          <span className={cn(
                            'text-sm font-semibold',
                            sentiment.overall === 'Positive' && 'text-emerald-500',
                            sentiment.overall === 'Neutral'  && 'text-amber-500',
                            sentiment.overall === 'Negative' && 'text-rose-500',
                          )}>
                            {sentiment.overall}
                          </span>
                          {sentiment.dominantEmotion && (
                            <span className="text-xs text-ink3">· {EMOTION_META[sentiment.dominantEmotion].emoji} {EMOTION_META[sentiment.dominantEmotion].label}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink3">{sentiment.total.toLocaleString()} notes</span>
                      </div>
                      {/* Gauge */}
                      <div className="relative h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" />
                        <div className="absolute inset-0 bg-surface2 rounded-full transition-all duration-700" style={{ left: `${sentiment.gauge}%` }} />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-rose-400">Negative</span>
                        <span className="text-[9px] text-emerald-500">Positive</span>
                      </div>
                    </div>

                    {/* Tone rows — clickable */}
                    <div className="px-3 py-2 border-b border-border space-y-0.5">
                      <p className="text-[9px] font-semibold text-ink3 uppercase tracking-wider px-1 mb-1.5">Tone</p>
                      {toneRows.map(({ label, count, pct, bar, icon }) => {
                        const isActive = sentimentFilter?.kind === 'tone' && sentimentFilter.value === label
                        return (
                          <button
                            key={label}
                            onClick={() => applySentimentFilter({ kind: 'tone', value: label })}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all',
                              isActive
                                ? 'bg-brand/10 ring-1 ring-brand/30'
                                : 'hover:bg-hover',
                            )}
                          >
                            <span className={cn('shrink-0', isActive ? 'text-brand' : 'text-ink3')}>{icon}</span>
                            <span className={cn('text-xs font-medium w-14 shrink-0', isActive ? 'text-brand' : 'text-ink2')}>{label}</span>
                            <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all duration-500', isActive ? 'bg-brand' : bar)} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-ink3 w-12 text-right shrink-0">{count.toLocaleString()} <span className="opacity-60">({pct}%)</span></span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Emotion rows — clickable */}
                    <div className="px-3 py-2 space-y-0.5">
                      <p className="text-[9px] font-semibold text-ink3 uppercase tracking-wider px-1 mb-1.5">Emotions</p>
                      {sentiment.emotions.map(({ emotion, count, pct }) => {
                        const meta = EMOTION_META[emotion]
                        const barPct = Math.round((pct / maxEmotionPct) * 100)
                        const isActive = sentimentFilter?.kind === 'emotion' && sentimentFilter.value === emotion
                        return (
                          <button
                            key={emotion}
                            onClick={() => applySentimentFilter({ kind: 'emotion', value: emotion })}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all',
                              isActive
                                ? 'bg-brand/10 ring-1 ring-brand/30'
                                : 'hover:bg-hover',
                            )}
                          >
                            <span className="text-sm shrink-0 leading-none">{meta.emoji}</span>
                            <span className={cn('text-xs font-medium w-20 shrink-0 truncate', isActive ? 'text-brand' : 'text-ink2')}>{meta.label}</span>
                            <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all duration-500', isActive ? 'bg-brand' : meta.bg)} style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-[10px] text-ink3 w-12 text-right shrink-0">{count.toLocaleString()} <span className="opacity-60">({pct}%)</span></span>
                          </button>
                        )
                      })}
                    </div>

                  </div>
                </Section>
              )
            })()}

            {/* Category breakdown */}
            {catStats.length > 0 && (
              <Section title="By category">
                <div className="bg-surface border border-border rounded-2xl px-4 py-4 space-y-3">
                  {catStats.map(({ name, count, pct }, i) => (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-ink truncate max-w-[60%]">{name}</span>
                        <span className="text-xs text-ink3 shrink-0">{count}</span>
                      </div>
                      <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', CAT_ACCENT_COLORS[i % CAT_ACCENT_COLORS.length])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Top tags */}
            {topTags.length > 0 && (
              <Section title="Top tags">
                <div className="bg-surface border border-border rounded-2xl px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map(([tag, count]) => (
                      <span key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-surface2 border border-border rounded-lg text-[11px] text-ink2 font-medium">
                        <Tag className="w-2.5 h-2.5 text-ink3" />
                        {tag}
                        <span className="text-[10px] text-ink3">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* Top people */}
            {topPeople.length > 0 && (
              <Section title="People">
                <div className="bg-surface border border-border rounded-2xl px-4 py-4 space-y-2.5">
                  {topPeople.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold
                        flex items-center justify-center shrink-0 uppercase">
                        {name[0]}
                      </div>
                      <span className="flex-1 text-sm text-ink font-medium truncate">{name}</span>
                      <span className="text-xs text-ink3">{count}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
