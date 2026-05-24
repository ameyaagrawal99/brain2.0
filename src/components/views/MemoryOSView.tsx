import { useMemo, useState } from 'react'
import {
  Archive, BookOpen, Brain, CalendarDays, Download, FileText, Filter,
  Lightbulb, PenLine, Search, Sparkles, Tag, Target,
} from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { buildMemorySignals, buildSourcePacket, summarizeThemes, type MemorySignal, type MemoryType } from '@/lib/memoryOS'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

type MemoryTab = 'overview' | 'writing' | 'themes' | 'timeline' | 'export'

const MEMORY_TYPES: MemoryType[] = [
  'Experience', 'Reflection', 'Article Idea', 'Book Fragment', 'Decision',
  'Lesson', 'Quote', 'Question', 'Project', 'Research Note',
]

const WRITING_TYPES = new Set<MemoryType>(['Article Idea', 'Book Fragment', 'Reflection', 'Lesson', 'Experience'])

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function typeColor(type: MemoryType) {
  if (type === 'Article Idea') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
  if (type === 'Book Fragment') return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
  if (type === 'Decision') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
  if (type === 'Lesson') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
  if (type === 'Question') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800'
  return 'bg-surface2 text-ink2 border-border'
}

function MemoryCard({ signal, onOpen }: { signal: MemorySignal; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-xl border border-border bg-surface p-4 shadow-sm hover:border-brand/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={cn('inline-flex border px-2 py-0.5 rounded-full text-[10px] font-semibold', typeColor(signal.type))}>
              {signal.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-ink3">
              <Target className="w-3 h-3" />
              {signal.sourceStrength}/100
            </span>
          </div>
          <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2">{signal.row.title || 'Untitled memory'}</h3>
          <p className="mt-1.5 text-xs text-ink2 leading-relaxed line-clamp-3">{signal.coreInsight}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {signal.themes.slice(0, 4).map((theme) => (
          <span key={theme} className="inline-flex items-center gap-1 rounded-full bg-brand/8 px-2 py-0.5 text-[10px] font-medium text-brand">
            <Tag className="w-2.5 h-2.5" />
            {theme}
          </span>
        ))}
        {signal.qualityGaps.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            {signal.qualityGaps.length} structure gaps
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-ink3 leading-relaxed">{signal.writingAngle}</p>
    </button>
  )
}

export function MemoryOSView() {
  const rows = useBrainStore((s) => s.rows)
  const openModal = useBrainStore((s) => s.openModal)

  const [tab, setTab] = useState<MemoryTab>('overview')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')

  const signals = useMemo(() => buildMemorySignals(rows), [rows])
  const themeSummary = useMemo(() => summarizeThemes(signals), [signals])
  const allThemes = themeSummary.map((theme) => theme.theme)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return signals.filter((signal) => {
      if (typeFilter !== 'all' && signal.type !== typeFilter) return false
      if (themeFilter !== 'all' && !signal.themes.includes(themeFilter)) return false
      if (!q) return true
      const hay = [
        signal.row.title, signal.row.original, signal.row.rewritten, signal.row.tags,
        signal.coreInsight, signal.writingAngle, signal.type, signal.themes.join(' '),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [signals, query, typeFilter, themeFilter])

  const writingSignals = filtered.filter((signal) => WRITING_TYPES.has(signal.type)).slice(0, 18)
  const sourceReady = filtered.filter((signal) => signal.sourceStrength >= 55).slice(0, 24)
  const needsStructure = signals.filter((signal) => signal.qualityGaps.length >= 3).slice(0, 8)
  const articleIdeas = signals.filter((signal) => signal.type === 'Article Idea').length
  const bookFragments = signals.filter((signal) => signal.type === 'Book Fragment').length
  const lessons = signals.filter((signal) => signal.type === 'Lesson').length

  const timeline = useMemo(() => {
    const groups = new Map<string, MemorySignal[]>()
    signals.forEach((signal) => {
      const month = signal.row.createdAt?.slice(0, 7) || 'Undated'
      groups.set(month, [...(groups.get(month) ?? []), signal])
    })
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  }, [signals])

  function exportCurrentPacket() {
    const label = themeFilter !== 'all' ? themeFilter : typeFilter !== 'all' ? typeFilter : query || 'Brain Memory Source'
    const packet = buildSourcePacket(sourceReady, label)
    downloadText(packet, `brain-source-packet-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'memory'}.md`)
  }

  if (!signals.length) {
    return (
      <div className="px-4 py-16 sm:px-6 sm:py-24 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
          <Brain className="w-6 h-6 text-brand" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Memory OS is waiting for entries</h2>
        <p className="mt-2 text-sm text-ink2 max-w-md mx-auto">Capture notes, reflections, ideas, and decisions first. This view will structure them without changing your sheet.</p>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-5 pb-8 max-w-7xl mx-auto">
      <div className="pt-4 sm:pt-6 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1 text-xs font-semibold text-brand mb-3">
              <Brain className="w-3.5 h-3.5" />
              Separate layer, same memories
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Memory OS</h1>
            <p className="mt-2 text-sm text-ink2 max-w-2xl leading-relaxed">
              A quiet workspace for turning lived experience into themes, writing source packets, decisions, lessons, and book/article raw material.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCurrentPacket}
            className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-ink text-white text-xs font-semibold shadow-sm hover:bg-brand transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export source packet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {[
          { label: 'Structured memories', value: signals.length, icon: Archive },
          { label: 'Article ideas', value: articleIdeas, icon: PenLine },
          { label: 'Book fragments', value: bookFragments, icon: BookOpen },
          { label: 'Lessons', value: lessons, icon: Lightbulb },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink3 font-medium">{label}</span>
              <Icon className="w-3.5 h-3.5 text-brand" />
            </div>
            <p className="mt-2 text-2xl font-bold text-ink tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="sticky top-[6.2rem] sm:top-[6.5rem] z-10 -mx-3 sm:-mx-5 px-3 sm:px-5 py-2 bg-bg/90 backdrop-blur-md border-y border-border/70">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search writing material, lessons, themes..."
              className="w-full h-9 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MemoryType | 'all')}
              className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-label="Filter by memory type"
            >
              <option value="all">All types</option>
              {MEMORY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-label="Filter by theme"
            >
              <option value="all">All themes</option>
              {allThemes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            ['overview', 'Overview', Sparkles],
            ['writing', 'Writing', PenLine],
            ['themes', 'Themes', Tag],
            ['timeline', 'Timeline', CalendarDays],
            ['export', 'Export', FileText],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                tab === key ? 'bg-brand text-white border-brand' : 'bg-surface text-ink2 border-border hover:bg-hover',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-4 mt-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Highest-value source memories</h2>
              <span className="text-xs text-ink3">{filtered.length} matching</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.slice(0, 10).map((signal) => (
                <MemoryCard key={signal.row._rowIndex} signal={signal} onOpen={() => openModal(signal.row)} />
              ))}
            </div>
          </section>
          <aside className="space-y-3">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-ink mb-3">Needs structure</h2>
              <div className="space-y-3">
                {needsStructure.map((signal) => (
                  <button key={signal.row._rowIndex} onClick={() => openModal(signal.row)} className="w-full text-left">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{signal.row.title || 'Untitled'}</p>
                    <p className="text-[11px] text-ink3 mt-0.5">{signal.qualityGaps.join(', ')}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-ink mb-3">Top themes</h2>
              <div className="space-y-2">
                {themeSummary.slice(0, 8).map((theme) => (
                  <button key={theme.theme} onClick={() => { setThemeFilter(theme.theme); setTab('themes') }} className="w-full flex items-center gap-2 text-left">
                    <span className="w-20 text-xs text-ink2 truncate">{theme.theme}</span>
                    <span className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
                      <span className="block h-full bg-brand rounded-full" style={{ width: `${Math.min(100, theme.count * 18)}%` }} />
                    </span>
                    <span className="text-[11px] text-ink3">{theme.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === 'writing' && (
        <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {writingSignals.map((signal) => <MemoryCard key={signal.row._rowIndex} signal={signal} onOpen={() => openModal(signal.row)} />)}
        </div>
      )}

      {tab === 'themes' && (
        <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {themeSummary.filter((theme) => themeFilter === 'all' || theme.theme === themeFilter).map((theme) => (
            <section key={theme.theme} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink capitalize">{theme.theme}</h2>
                <span className="text-xs text-ink3">{theme.count} memories</span>
              </div>
              <div className="space-y-2">
                {theme.sources.map((signal) => (
                  <button key={signal.row._rowIndex} onClick={() => openModal(signal.row)} className="w-full text-left rounded-lg bg-surface2/60 p-2 hover:bg-hover transition-colors">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{signal.row.title || 'Untitled'}</p>
                    <p className="text-[11px] text-ink3 line-clamp-2 mt-0.5">{signal.coreInsight}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="mt-4 space-y-3">
          {timeline.map(([month, monthSignals]) => (
            <section key={month} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-ink">{month}</h2>
                <span className="text-xs text-ink3">{monthSignals.length} memories</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {monthSignals.slice(0, 6).map((signal) => (
                  <button key={signal.row._rowIndex} onClick={() => openModal(signal.row)} className="text-left rounded-lg bg-surface2/60 p-3 hover:bg-hover transition-colors">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{signal.row.title || 'Untitled'}</p>
                    <p className="mt-1 text-[11px] text-ink3">{formatDate(signal.row.createdAt)}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'export' && (
        <div className="mt-4 grid lg:grid-cols-[0.8fr_1.2fr] gap-4">
          <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Source packet builder</h2>
            <p className="mt-2 text-xs text-ink2 leading-relaxed">
              Uses the current search/type/theme filters and includes the strongest memories. Export this packet into your article, book, or Codex context.
            </p>
            <button
              type="button"
              onClick={exportCurrentPacket}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-xl bg-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Download Markdown packet
            </button>
          </section>
          <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-ink">Packet preview</h2>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {sourceReady.map((signal) => (
                <button key={signal.row._rowIndex} onClick={() => openModal(signal.row)} className="w-full text-left rounded-lg bg-surface2/60 p-3 hover:bg-hover transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{signal.row.title || 'Untitled'}</p>
                    <span className="text-[10px] text-ink3">{signal.sourceStrength}/100</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink3 line-clamp-2">{signal.writingAngle}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
