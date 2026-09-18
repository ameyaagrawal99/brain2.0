import { useMemo, useState, useCallback } from 'react'
import {
  BookOpen, Tag, Users, Layers, Lightbulb, Search,
  ChevronRight, ArrowLeft, TrendingUp, AlertCircle,
  Link2, CalendarDays, Target, Zap, GitBranch,
  CheckCircle2, Circle, BarChart3,
} from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import { formatDate, parseTags } from '@/lib/utils'
import {
  buildWikiIntelligence, buildEntryContext,
  type WikiPage, type WikiPageKind, type WikiIntelligence, type WikiInsight,
} from '@/lib/wikiEngine'
import { EMOTION_META, type Emotion } from '@/lib/sentiment'
import { LINK_TYPE_LABELS } from '@/types/sheet'

type WikiTab = 'index' | 'page' | 'insights' | 'timeline'

const KIND_ICONS: Record<WikiPageKind, typeof Tag> = {
  category: Layers,
  tag: Tag,
  person: Users,
  theme: Lightbulb,
  status: CheckCircle2,
  entry: BookOpen,
}

const KIND_LABELS: Record<WikiPageKind, string> = {
  category: 'Category',
  tag: 'Tag',
  person: 'Person',
  theme: 'Theme',
  status: 'Status',
  entry: 'Entry',
}

const KIND_COLORS: Record<WikiPageKind, string> = {
  category: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  tag: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  person: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  theme: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  status: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  entry: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

const INSIGHT_ICONS: Record<WikiInsight['type'], typeof Lightbulb> = {
  pattern: TrendingUp,
  gap: AlertCircle,
  connection: Link2,
  trend: BarChart3,
  contradiction: Zap,
}

const INSIGHT_COLORS: Record<WikiInsight['type'], string> = {
  pattern: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  gap: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  connection: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20',
  trend: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20',
  contradiction: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20',
}

function SentimentBadge({ label }: { label: string }) {
  const color =
    label === 'Positive'
      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20'
      : label === 'Negative'
        ? 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/20'
        : 'text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-800/30'
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', color)}>
      {label}
    </span>
  )
}

function EmotionBadge({ emotion }: { emotion: Emotion }) {
  const meta = EMOTION_META[emotion]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', meta.color)}>
      {meta.emoji} {meta.label}
    </span>
  )
}

function PageCard({
  page,
  onClick,
  compact,
}: {
  page: WikiPage
  onClick: () => void
  compact?: boolean
}) {
  const Icon = KIND_ICONS[page.kind]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-surface shadow-sm hover:border-brand/30 hover:shadow-md transition-all',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', KIND_COLORS[page.kind])}>
              <Icon className="w-3 h-3" />
              {KIND_LABELS[page.kind]}
            </span>
            <SentimentBadge label={page.stats.sentimentLabel} />
            {page.stats.dominantEmotion && (
              <EmotionBadge emotion={page.stats.dominantEmotion} />
            )}
          </div>
          <h3 className="text-sm font-semibold text-ink capitalize truncate">{page.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-ink tabular-nums">{page.stats.entryCount}</span>
          <p className="text-[10px] text-ink3">entries</p>
        </div>
      </div>
      {!compact && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {page.stats.themes.slice(0, 4).map((theme) => (
            <span key={theme} className="inline-flex px-2 py-0.5 rounded-full bg-brand/10 dark:bg-brand/15 text-[10px] font-medium text-brand capitalize">
              {theme}
            </span>
          ))}
          {page.stats.memoryTypes.slice(0, 2).map(({ type, count }) => (
            <span key={type} className="inline-flex px-2 py-0.5 rounded-full bg-surface2 text-[10px] text-ink3">
              {type} ({count})
            </span>
          ))}
        </div>
      )}
      {!compact && page.relatedPages.length > 0 && (
        <p className="mt-2 text-[11px] text-ink3 flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {page.relatedPages.length} connected page{page.relatedPages.length !== 1 ? 's' : ''}
        </p>
      )}
    </button>
  )
}

function WikiPageDetail({
  page,
  wiki,
  onNavigate,
  onOpenEntry,
}: {
  page: WikiPage
  wiki: WikiIntelligence
  onNavigate: (key: string) => void
  onOpenEntry: (row: import('@/types/sheet').BrainRow) => void
}) {
  const [entrySearch, setEntrySearch] = useState('')
  const allRows = useBrainStore((s) => s.rows)

  const filteredEntries = useMemo(() => {
    const q = entrySearch.toLowerCase().trim()
    if (!q) return page.entries
    return page.entries.filter((e) => {
      const hay = [e.title, e.original, e.rewritten, e.tags, e.category].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [page.entries, entrySearch])

  const Icon = KIND_ICONS[page.kind]

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', KIND_COLORS[page.kind])}>
            <Icon className="w-3.5 h-3.5" />
            {KIND_LABELS[page.kind]}
          </span>
          <SentimentBadge label={page.stats.sentimentLabel} />
          {page.stats.dominantEmotion && <EmotionBadge emotion={page.stats.dominantEmotion} />}
        </div>
        <h2 className="text-xl font-bold text-ink capitalize">{page.title}</h2>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-lg bg-surface2 p-3">
            <p className="text-[11px] text-ink3 font-medium">Entries</p>
            <p className="text-lg font-bold text-ink">{page.stats.entryCount}</p>
          </div>
          <div className="rounded-lg bg-surface2 p-3">
            <p className="text-[11px] text-ink3 font-medium">Wiki Links</p>
            <p className="text-lg font-bold text-ink">{page.stats.linkCount}</p>
          </div>
          <div className="rounded-lg bg-surface2 p-3">
            <p className="text-[11px] text-ink3 font-medium">Actions</p>
            <p className="text-lg font-bold text-ink">
              {page.stats.completedCount}/{page.stats.actionItemCount}
            </p>
          </div>
          <div className="rounded-lg bg-surface2 p-3">
            <p className="text-[11px] text-ink3 font-medium">Date Range</p>
            <p className="text-xs font-semibold text-ink">
              {page.stats.dateRange
                ? `${page.stats.dateRange.earliest.slice(5)} to ${page.stats.dateRange.latest.slice(5)}`
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Themes */}
        {page.stats.themes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {page.stats.themes.map((theme) => {
              const themeKey = `theme:${theme.toLowerCase()}`
              const themePage = wiki.pages.get(themeKey)
              return (
                <button
                  key={theme}
                  onClick={() => themePage && onNavigate(themeKey)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                    themePage ? 'bg-brand/10 dark:bg-brand/15 text-brand hover:bg-brand/20 cursor-pointer' : 'bg-surface2 text-ink3',
                  )}
                >
                  <Lightbulb className="w-3 h-3" />
                  {theme}
                </button>
              )
            })}
          </div>
        )}

        {/* Memory type breakdown */}
        {page.stats.memoryTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {page.stats.memoryTypes.map(({ type, count }) => (
              <span key={type} className="inline-flex px-2 py-0.5 rounded-full bg-surface2 text-[10px] text-ink2 font-medium">
                {type}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Connected pages */}
      {page.relatedPages.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-brand" />
            Connected Pages ({page.relatedPages.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {page.relatedPages.slice(0, 12).map((rp) => {
              const RPIcon = KIND_ICONS[rp.kind]
              return (
                <button
                  key={rp.key}
                  onClick={() => onNavigate(rp.key)}
                  className="flex items-center gap-2 rounded-lg bg-surface2 p-2.5 hover:bg-hover transition-colors text-left"
                >
                  <RPIcon className="w-3.5 h-3.5 text-ink3 shrink-0" />
                  <span className="text-xs font-medium text-ink truncate capitalize">{rp.title}</span>
                  <span className="ml-auto text-[10px] text-ink3 shrink-0">{rp.sharedCount} shared</span>
                  <ChevronRight className="w-3 h-3 text-ink3 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">Entries</h3>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink3" />
            <input
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full h-7 rounded-lg border border-border bg-surface pl-7 pr-2 text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredEntries.map((entry) => {
            const ctx = buildEntryContext(entry, allRows)
            return (
              <button
                key={entry._rowIndex}
                onClick={() => onOpenEntry(entry)}
                className="w-full text-left rounded-lg bg-surface2 p-3 hover:bg-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink line-clamp-1">{entry.title || 'Untitled'}</p>
                    <p className="text-[11px] text-ink3 mt-0.5 line-clamp-2">
                      {entry.rewritten || entry.original || entry.actionItems || ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-ink3">{formatDate(entry.createdAt)}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-ink3 font-medium">
                    {ctx.memoryType}
                  </span>
                  {ctx.outLinks.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/10 dark:bg-brand/15 text-brand font-medium">
                      {ctx.outLinks.length} link{ctx.outLinks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {ctx.backlinks.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 font-medium">
                      {ctx.backlinks.length} backlink{ctx.backlinks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {entry.taskStatus?.trim() && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      entry.taskStatus.toLowerCase().includes('done')
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
                    )}>
                      {entry.taskStatus}
                    </span>
                  )}
                  {parseTags(entry.tags).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate(`tag:${t.toLowerCase()}`)
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-ink3 hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/15 cursor-pointer"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                {(ctx.outLinks.length > 0 || ctx.backlinks.length > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {ctx.outLinks.slice(0, 3).map((l, i) => (
                      <span key={`out-${i}`} className="text-[10px] text-brand">
                        {LINK_TYPE_LABELS[l.type] || 'Linked'}: {l.title}
                      </span>
                    ))}
                    {ctx.backlinks.slice(0, 2).map((l, i) => (
                      <span key={`back-${i}`} className="text-[10px] text-violet-500">
                        Backlink from: {l.title}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function WikiView() {
  const rows = useBrainStore((s) => s.rows)
  const openModal = useBrainStore((s) => s.openModal)

  const [tab, setTab] = useState<WikiTab>('index')
  const [activePage, setActivePage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<WikiPageKind | 'all'>('all')
  const [history, setHistory] = useState<string[]>([])

  const wiki = useMemo(() => buildWikiIntelligence(rows), [rows])

  const allPages = useMemo(() => {
    const list = [...wiki.pages.values()]
    const q = searchQuery.toLowerCase().trim()
    return list
      .filter((p) => {
        if (kindFilter !== 'all' && p.kind !== kindFilter) return false
        if (q && !p.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.stats.entryCount - a.stats.entryCount)
  }, [wiki, searchQuery, kindFilter])

  const navigateTo = useCallback((key: string) => {
    if (activePage) {
      setHistory((h) => [...h, activePage])
    }
    setActivePage(key)
    setTab('page')
  }, [activePage])

  const goBack = useCallback(() => {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      setActivePage(prev)
    } else {
      setActivePage(null)
      setTab('index')
    }
  }, [history])

  const currentPage = activePage ? wiki.pages.get(activePage) : null

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of wiki.pages.values()) {
      counts[p.kind] = (counts[p.kind] ?? 0) + 1
    }
    return counts
  }, [wiki])

  if (rows.length === 0) {
    return (
      <div className="px-4 py-16 sm:px-6 sm:py-24 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
          <BookOpen className="w-6 h-6 text-brand" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Wiki is waiting for entries</h2>
        <p className="mt-2 text-sm text-ink2 max-w-md mx-auto">
          Add entries to your Google Sheet with categories, tags, and links. The wiki will automatically connect the dots.
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-5 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="pt-4 sm:pt-6 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 dark:bg-brand/15 px-3 py-1 text-xs font-semibold text-brand mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              Connected Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Knowledge Wiki</h1>
            <p className="mt-2 text-sm text-ink2 max-w-2xl leading-relaxed">
              All your entries, tags, categories, people, and themes automatically connected into navigable intelligence.
              Click any page to explore its connections.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink3">
            <span className="font-semibold text-ink">{wiki.pages.size}</span> pages
            <span className="text-ink3">from</span>
            <span className="font-semibold text-ink">{rows.length}</span> entries
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        {(
          [
            ['category', 'Categories'],
            ['tag', 'Tags'],
            ['person', 'People'],
            ['theme', 'Themes'],
            ['status', 'Statuses'],
          ] as [WikiPageKind, string][]
        ).map(([kind, label]) => {
          const Icon = KIND_ICONS[kind]
          return (
            <button
              key={kind}
              onClick={() => { setKindFilter(kindFilter === kind ? 'all' : kind); setTab('index') }}
              className={cn(
                'rounded-xl border bg-surface p-3 shadow-sm text-left transition-colors',
                kindFilter === kind ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-brand/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink3 font-medium">{label}</span>
                <Icon className="w-3.5 h-3.5 text-brand" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-ink tracking-tight">{kindCounts[kind] ?? 0}</p>
            </button>
          )
        })}
        <button
          onClick={() => setTab('insights')}
          className={cn(
            'rounded-xl border bg-surface p-3 shadow-sm text-left transition-colors',
            tab === 'insights' ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-brand/20',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink3 font-medium">Insights</span>
            <Zap className="w-3.5 h-3.5 text-brand" />
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink tracking-tight">{wiki.insights.length}</p>
        </button>
      </div>

      {/* Search + tabs */}
      <div className="sticky top-[6.2rem] sm:top-[6.5rem] z-10 -mx-3 sm:-mx-5 px-3 sm:px-5 py-2 bg-bg/95 backdrop-blur-md border-y border-border/70">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wiki pages..."
              className="w-full h-9 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          {tab === 'page' && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-surface text-xs font-semibold text-ink hover:bg-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            ['index', 'Index', BookOpen],
            ['insights', 'Insights', Zap],
            ['timeline', 'Timeline', CalendarDays],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); if (key !== 'page') setActivePage(null) }}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                tab === key ? 'bg-brand text-white border-brand' : 'bg-surface text-ink2 border-border hover:bg-hover',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          {tab === 'page' && currentPage && (
            <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold bg-brand text-white border border-brand">
              {(() => { const PI = KIND_ICONS[currentPage.kind]; return <PI className="w-3.5 h-3.5" /> })()}
              {currentPage.title}
            </div>
          )}
        </div>
      </div>

      {/* Index tab */}
      {tab === 'index' && (
        <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {allPages.map((page) => (
            <PageCard
              key={page.key}
              page={page}
              onClick={() => navigateTo(page.key)}
            />
          ))}
          {allPages.length === 0 && (
            <div className="col-span-full text-center py-12 text-ink3 text-sm">
              No wiki pages match your search.
            </div>
          )}
        </div>
      )}

      {/* Page detail tab */}
      {tab === 'page' && currentPage && (
        <div className="mt-4">
          <WikiPageDetail
            page={currentPage}
            wiki={wiki}
            onNavigate={navigateTo}
            onOpenEntry={openModal}
          />
        </div>
      )}

      {/* Insights tab */}
      {tab === 'insights' && (
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {wiki.insights.map((insight, idx) => {
              const InsightIcon = INSIGHT_ICONS[insight.type]
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', INSIGHT_COLORS[insight.type])}>
                      <InsightIcon className="w-3 h-3" />
                      {insight.type}
                    </span>
                    <span className="text-[10px] text-ink3 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {Math.round(insight.strength)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink">{insight.title}</h3>
                  <p className="mt-1.5 text-xs text-ink2 leading-relaxed">{insight.description}</p>
                  {insight.relatedPages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {insight.relatedPages.map((pk) => {
                        const p = wiki.pages.get(pk)
                        return p ? (
                          <button
                            key={pk}
                            onClick={() => navigateTo(pk)}
                            className="text-[10px] text-brand hover:underline capitalize"
                          >
                            {p.title}
                          </button>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Top connections */}
          {wiki.connections.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand" />
                Strongest Connections
              </h3>
              <div className="space-y-2">
                {wiki.connections.slice(0, 15).map((conn, idx) => {
                  const fromPage = wiki.pages.get(conn.from)
                  const toPage = wiki.pages.get(conn.to)
                  if (!fromPage || !toPage) return null
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => navigateTo(conn.from)}
                        className="text-brand hover:underline capitalize truncate max-w-[120px]"
                      >
                        {fromPage.title}
                      </button>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="flex-1 h-1 rounded-full bg-surface2 overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${Math.min(100, conn.strength * 10)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-ink3 shrink-0">{conn.sharedEntries}</span>
                      </div>
                      <button
                        onClick={() => navigateTo(conn.to)}
                        className="text-brand hover:underline capitalize truncate max-w-[120px]"
                      >
                        {toPage.title}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline tab */}
      {tab === 'timeline' && (
        <div className="mt-4 space-y-3">
          {wiki.timeline.map((month) => (
            <div key={month.month} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">{month.month}</h3>
                <div className="flex items-center gap-2">
                  <SentimentBadge label={month.sentiment} />
                  <span className="text-xs text-ink3">{month.entryCount} entries</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {month.topCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => navigateTo(`category:${cat.toLowerCase().trim()}`)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    <Layers className="w-2.5 h-2.5" />
                    {cat}
                  </button>
                ))}
                {month.topTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => navigateTo(`tag:${tag.toLowerCase()}`)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-medium hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
