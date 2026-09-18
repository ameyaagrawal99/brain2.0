import type { BrainRow, LinkType } from '@/types/sheet'
import { parseTags } from './utils'
import { extractTypedLinks, resolveLinkedRowsTyped, getBacklinks } from './linkGraph'
import { classifyMemoryType, extractThemes, type MemoryType } from './memoryOS'
import { analyzeSentiment, type Emotion } from './sentiment'

export type WikiPageKind = 'category' | 'tag' | 'person' | 'theme' | 'status' | 'entry'

export interface WikiPage {
  kind: WikiPageKind
  key: string
  title: string
  entries: BrainRow[]
  relatedPages: { key: string; title: string; kind: WikiPageKind; sharedCount: number }[]
  stats: WikiPageStats
}

export interface WikiPageStats {
  entryCount: number
  avgSentiment: number
  sentimentLabel: 'Positive' | 'Neutral' | 'Negative'
  dominantEmotion: Emotion | null
  memoryTypes: { type: MemoryType; count: number }[]
  themes: string[]
  dateRange: { earliest: string; latest: string } | null
  actionItemCount: number
  completedCount: number
  linkCount: number
}

export interface WikiConnection {
  from: string
  to: string
  strength: number
  sharedEntries: number
  sharedTags: string[]
  relationship: string
}

export interface WikiIntelligence {
  pages: Map<string, WikiPage>
  connections: WikiConnection[]
  clusters: WikiCluster[]
  insights: WikiInsight[]
  timeline: WikiTimelineMonth[]
}

export interface WikiCluster {
  label: string
  pages: string[]
  cohesion: number
}

export interface WikiInsight {
  type: 'pattern' | 'gap' | 'connection' | 'trend' | 'contradiction'
  title: string
  description: string
  relatedPages: string[]
  strength: number
}

export interface WikiTimelineMonth {
  month: string
  entryCount: number
  topCategories: string[]
  topTags: string[]
  sentiment: 'Positive' | 'Neutral' | 'Negative'
}

export interface EntryWikiContext {
  row: BrainRow
  memoryType: MemoryType
  themes: string[]
  sentiment: { label: string; score: number; dominantEmotion: Emotion | null }
  outLinks: { title: string; type: LinkType }[]
  backlinks: { title: string; type: LinkType }[]
  sharedTagPages: string[]
  sharedCategoryPage: string | null
  sharedPeoplePages: string[]
}

function pageKey(kind: WikiPageKind, name: string): string {
  return `${kind}:${name.toLowerCase().trim()}`
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function computePageStats(entries: BrainRow[]): WikiPageStats {
  let totalSentiment = 0
  const emotionCounts: Record<Emotion, number> = {
    joy: 0, trust: 0, anticipation: 0, surprise: 0,
    fear: 0, sadness: 0, disgust: 0, anger: 0,
  }
  const typeCounts = new Map<MemoryType, number>()
  const themeSet = new Set<string>()
  let actionCount = 0
  let doneCount = 0
  let linkCount = 0
  let earliest = ''
  let latest = ''

  for (const row of entries) {
    const text = [row.title, row.original, row.rewritten, row.actionItems].filter(Boolean).join(' ')
    const sent = analyzeSentiment(text)
    totalSentiment += sent.comparative

    for (const e of Object.keys(sent.emotions) as Emotion[]) {
      emotionCounts[e] += sent.emotions[e]
    }

    const mt = classifyMemoryType(row)
    typeCounts.set(mt, (typeCounts.get(mt) ?? 0) + 1)

    for (const theme of extractThemes(row)) {
      themeSet.add(theme)
    }

    if (row.actionItems?.trim()) {
      const lines = row.actionItems.split('\n').filter((l) => l.trim())
      actionCount += lines.length
      doneCount += lines.filter((l) => /\[[xX]\]/.test(l)).length
    }

    const links = extractTypedLinks(row.links ?? '')
    linkCount += links.length

    const d = row.createdAt?.slice(0, 10) ?? ''
    if (d) {
      if (!earliest || d < earliest) earliest = d
      if (!latest || d > latest) latest = d
    }
  }

  const avg = entries.length > 0 ? totalSentiment / entries.length : 0
  const sentimentLabel: WikiPageStats['sentimentLabel'] =
    avg > 0.02 ? 'Positive' : avg < -0.02 ? 'Negative' : 'Neutral'

  const emotionEntries = (Object.keys(emotionCounts) as Emotion[])
    .map((e) => ({ emotion: e, count: emotionCounts[e] }))
    .sort((a, b) => b.count - a.count)
  const dominantEmotion = emotionEntries[0]?.count > 0 ? emotionEntries[0].emotion : null

  const memoryTypes = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return {
    entryCount: entries.length,
    avgSentiment: avg,
    sentimentLabel,
    dominantEmotion,
    memoryTypes,
    themes: [...themeSet].slice(0, 8),
    dateRange: earliest ? { earliest, latest } : null,
    actionItemCount: actionCount,
    completedCount: doneCount,
    linkCount,
  }
}

function findRelatedPages(
  currentKey: string,
  currentEntries: Set<number>,
  pageEntryMap: Map<string, Set<number>>,
  pageIndex: Map<string, { title: string; kind: WikiPageKind }>,
): WikiPage['relatedPages'] {
  const related: WikiPage['relatedPages'] = []

  for (const [key, entrySet] of pageEntryMap) {
    if (key === currentKey) continue
    let shared = 0
    for (const idx of currentEntries) {
      if (entrySet.has(idx)) shared++
    }
    if (shared > 0) {
      const meta = pageIndex.get(key)
      if (meta) {
        related.push({ key, title: meta.title, kind: meta.kind, sharedCount: shared })
      }
    }
  }

  return related.sort((a, b) => b.sharedCount - a.sharedCount).slice(0, 20)
}

function generateInsights(
  pages: Map<string, WikiPage>,
  connections: WikiConnection[],
  rows: BrainRow[],
): WikiInsight[] {
  const insights: WikiInsight[] = []

  const catPages = [...pages.values()].filter((p) => p.kind === 'category')
  const tagPages = [...pages.values()].filter((p) => p.kind === 'tag')

  // Pattern: heavily connected clusters
  for (const conn of connections.slice(0, 10)) {
    if (conn.strength >= 5) {
      insights.push({
        type: 'connection',
        title: `Strong link: ${conn.from.split(':')[1]} and ${conn.to.split(':')[1]}`,
        description: `${conn.sharedEntries} entries connect these areas${conn.sharedTags.length > 0 ? `, sharing tags: ${conn.sharedTags.slice(0, 3).join(', ')}` : ''}.`,
        relatedPages: [conn.from, conn.to],
        strength: conn.strength,
      })
    }
  }

  // Pattern: largest categories
  const sorted = catPages.sort((a, b) => b.entries.length - a.entries.length)
  if (sorted.length >= 2) {
    const top = sorted[0]
    const second = sorted[1]
    insights.push({
      type: 'pattern',
      title: `Primary focus: ${top.title}`,
      description: `${top.entries.length} entries in ${top.title} vs ${second.entries.length} in ${second.title}. This reflects your dominant area of attention.`,
      relatedPages: [top.key, second.key],
      strength: top.entries.length,
    })
  }

  // Gap: orphan entries (no tags, no links, no people)
  const orphans = rows.filter(
    (r) => !r.tags?.trim() && !r.links?.trim() && !r.people?.trim(),
  )
  if (orphans.length > 0) {
    insights.push({
      type: 'gap',
      title: `${orphans.length} unconnected entries`,
      description: 'These entries have no tags, links, or people attached. Adding context would integrate them into the knowledge graph.',
      relatedPages: [],
      strength: orphans.length,
    })
  }

  // Trend: sentiment shifts over time
  const monthSentiments = new Map<string, number[]>()
  for (const row of rows) {
    const month = row.createdAt?.slice(0, 7)
    if (!month) continue
    const text = [row.title, row.original, row.rewritten].filter(Boolean).join(' ')
    const s = analyzeSentiment(text)
    const arr = monthSentiments.get(month) ?? []
    arr.push(s.comparative)
    monthSentiments.set(month, arr)
  }

  const months = [...monthSentiments.entries()]
    .map(([m, scores]) => ({ month: m, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => a.month.localeCompare(b.month))

  if (months.length >= 3) {
    const recent = months.slice(-2)
    const earlier = months.slice(0, -2)
    const recentAvg = recent.reduce((a, b) => a + b.avg, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b.avg, 0) / earlier.length
    const delta = recentAvg - earlierAvg

    if (Math.abs(delta) > 0.03) {
      insights.push({
        type: 'trend',
        title: `Sentiment trending ${delta > 0 ? 'more positive' : 'more negative'}`,
        description: `Recent entries show a ${delta > 0 ? 'more positive' : 'more negative'} tone compared to earlier ones. This may reflect evolving context or priorities.`,
        relatedPages: [],
        strength: Math.abs(delta) * 20,
      })
    }
  }

  // Tags that appear across many categories = cross-cutting concerns
  for (const tp of tagPages) {
    const categories = new Set<string>()
    for (const e of tp.entries) {
      if (e.category?.trim()) categories.add(e.category.trim())
    }
    if (categories.size >= 3) {
      insights.push({
        type: 'pattern',
        title: `Cross-cutting theme: ${tp.title}`,
        description: `The tag "${tp.title}" spans ${categories.size} categories: ${[...categories].slice(0, 4).join(', ')}. This is a connecting thread across your thinking.`,
        relatedPages: [tp.key],
        strength: categories.size * 2,
      })
    }
  }

  return insights.sort((a, b) => b.strength - a.strength)
}

function buildTimeline(rows: BrainRow[]): WikiTimelineMonth[] {
  const groups = new Map<string, BrainRow[]>()
  for (const row of rows) {
    const month = row.createdAt?.slice(0, 7) || 'Undated'
    const arr = groups.get(month) ?? []
    arr.push(row)
    groups.set(month, arr)
  }

  return [...groups.entries()]
    .filter(([m]) => m !== 'Undated')
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 24)
    .map(([month, entries]) => {
      const catCounts = new Map<string, number>()
      const tagCounts = new Map<string, number>()

      for (const e of entries) {
        if (e.category?.trim()) catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1)
        for (const t of parseTags(e.tags)) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      }

      const texts = entries.map((e) =>
        [e.title, e.original, e.rewritten].filter(Boolean).join(' '),
      )
      let totalComp = 0
      for (const t of texts) totalComp += analyzeSentiment(t).comparative
      const avg = texts.length > 0 ? totalComp / texts.length : 0

      return {
        month,
        entryCount: entries.length,
        topCategories: [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
        topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t),
        sentiment: avg > 0.02 ? 'Positive' as const : avg < -0.02 ? 'Negative' as const : 'Neutral' as const,
      }
    })
}

export function buildEntryContext(row: BrainRow, allRows: BrainRow[]): EntryWikiContext {
  const mt = classifyMemoryType(row)
  const themes = extractThemes(row)
  const text = [row.title, row.original, row.rewritten, row.actionItems].filter(Boolean).join(' ')
  const sent = analyzeSentiment(text)
  const emotionEntries = (Object.keys(sent.emotions) as Emotion[])
    .map((e) => ({ e, c: sent.emotions[e] }))
    .sort((a, b) => b.c - a.c)

  const outLinks = extractTypedLinks(
    [row.links, row.original, row.rewritten, row.actionItems].filter(Boolean).join('\n'),
  ).map((l) => ({ title: l.title, type: l.type }))

  const backlinks = getBacklinks(row, allRows).map((bl) => ({
    title: bl.row.title,
    type: bl.type,
  }))

  const tags = parseTags(row.tags)
  const sharedTagPages = tags.map((t) => pageKey('tag', t))
  const sharedCategoryPage = row.category?.trim() ? pageKey('category', row.category.trim()) : null
  const people = splitList(row.people)
  const sharedPeoplePages = people.map((p) => pageKey('person', p))

  return {
    row,
    memoryType: mt,
    themes,
    sentiment: {
      label: sent.label,
      score: sent.comparative,
      dominantEmotion: emotionEntries[0]?.c > 0 ? emotionEntries[0].e : null,
    },
    outLinks,
    backlinks,
    sharedTagPages,
    sharedCategoryPage,
    sharedPeoplePages,
  }
}

export function buildWikiIntelligence(rows: BrainRow[]): WikiIntelligence {
  const pages = new Map<string, WikiPage>()
  const pageEntryMap = new Map<string, Set<number>>()
  const pageIndex = new Map<string, { title: string; kind: WikiPageKind }>()

  function ensurePage(kind: WikiPageKind, name: string): string {
    const key = pageKey(kind, name)
    if (!pages.has(key)) {
      pages.set(key, {
        kind,
        key,
        title: name,
        entries: [],
        relatedPages: [],
        stats: {} as WikiPageStats,
      })
      pageEntryMap.set(key, new Set())
      pageIndex.set(key, { title: name, kind })
    }
    return key
  }

  function addEntry(key: string, row: BrainRow) {
    const page = pages.get(key)
    if (!page) return
    if (!page.entries.some((e) => e._rowIndex === row._rowIndex)) {
      page.entries.push(row)
      pageEntryMap.get(key)?.add(row._rowIndex)
    }
  }

  // Build pages from entries
  for (const row of rows) {
    // Category page
    if (row.category?.trim()) {
      const key = ensurePage('category', row.category.trim())
      addEntry(key, row)
    }

    // Tag pages
    for (const tag of parseTags(row.tags)) {
      const key = ensurePage('tag', tag)
      addEntry(key, row)
    }

    // People pages
    for (const person of splitList(row.people)) {
      const key = ensurePage('person', person)
      addEntry(key, row)
    }

    // Status pages
    if (row.taskStatus?.trim()) {
      const key = ensurePage('status', row.taskStatus.trim())
      addEntry(key, row)
    }

    // Theme pages (derived)
    for (const theme of extractThemes(row)) {
      const key = ensurePage('theme', theme)
      addEntry(key, row)
    }
  }

  // Compute stats for each page
  for (const [, page] of pages) {
    page.stats = computePageStats(page.entries)
  }

  // Find related pages
  for (const [key, entrySet] of pageEntryMap) {
    const page = pages.get(key)
    if (page) {
      page.relatedPages = findRelatedPages(key, entrySet, pageEntryMap, pageIndex)
    }
  }

  // Build connections between pages
  const connections: WikiConnection[] = []
  const connSeen = new Set<string>()

  for (const [keyA, setA] of pageEntryMap) {
    for (const [keyB, setB] of pageEntryMap) {
      if (keyA >= keyB) continue
      const connKey = `${keyA}|${keyB}`
      if (connSeen.has(connKey)) continue

      let shared = 0
      for (const idx of setA) {
        if (setB.has(idx)) shared++
      }
      if (shared === 0) continue

      connSeen.add(connKey)

      const metaA = pageIndex.get(keyA)
      const metaB = pageIndex.get(keyB)
      if (!metaA || !metaB) continue

      // Find shared tags between the two pages' entries
      const tagsA = new Set<string>()
      const tagsB = new Set<string>()
      for (const e of pages.get(keyA)?.entries ?? []) {
        for (const t of parseTags(e.tags)) tagsA.add(t)
      }
      for (const e of pages.get(keyB)?.entries ?? []) {
        for (const t of parseTags(e.tags)) tagsB.add(t)
      }
      const sharedTags = [...tagsA].filter((t) => tagsB.has(t))

      connections.push({
        from: keyA,
        to: keyB,
        strength: shared + sharedTags.length * 0.5,
        sharedEntries: shared,
        sharedTags,
        relationship: shared >= 5 ? 'strong' : shared >= 2 ? 'moderate' : 'weak',
      })
    }
  }

  connections.sort((a, b) => b.strength - a.strength)

  // Build clusters (pages with high mutual connectivity)
  const clusters: WikiCluster[] = []
  const catPages = [...pages.values()].filter((p) => p.kind === 'category' && p.entries.length >= 2)
  for (const cp of catPages) {
    const clusterPages = [cp.key, ...cp.relatedPages.slice(0, 5).map((r) => r.key)]
    clusters.push({
      label: cp.title,
      pages: clusterPages,
      cohesion: cp.relatedPages.reduce((sum, r) => sum + r.sharedCount, 0),
    })
  }
  clusters.sort((a, b) => b.cohesion - a.cohesion)

  const insights = generateInsights(pages, connections, rows)
  const timeline = buildTimeline(rows)

  return { pages, connections, clusters, insights, timeline }
}
