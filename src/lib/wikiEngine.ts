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

interface CachedSentiment {
  comparative: number
  emotions: Record<Emotion, number>
  label: string
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

function getSentimentText(row: BrainRow): string {
  return [row.title, row.original, row.rewritten, row.actionItems].filter(Boolean).join(' ')
}

function computePageStats(
  entries: BrainRow[],
  sentimentCache: Map<number, CachedSentiment>,
): WikiPageStats {
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
    const sent = sentimentCache.get(row._rowIndex)!
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

function generateInsights(
  pages: Map<string, WikiPage>,
  connections: WikiConnection[],
  rows: BrainRow[],
  sentimentCache: Map<number, CachedSentiment>,
): WikiInsight[] {
  const insights: WikiInsight[] = []

  const catPages = [...pages.values()].filter((p) => p.kind === 'category')
  const tagPages = [...pages.values()].filter((p) => p.kind === 'tag')

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

  const monthSentiments = new Map<string, number[]>()
  for (const row of rows) {
    const month = row.createdAt?.slice(0, 7)
    if (!month) continue
    const sent = sentimentCache.get(row._rowIndex)
    if (!sent) continue
    const arr = monthSentiments.get(month) ?? []
    arr.push(sent.comparative)
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

function buildTimeline(
  rows: BrainRow[],
  sentimentCache: Map<number, CachedSentiment>,
): WikiTimelineMonth[] {
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

      let totalComp = 0
      for (const e of entries) {
        const sent = sentimentCache.get(e._rowIndex)
        if (sent) totalComp += sent.comparative
      }
      const avg = entries.length > 0 ? totalComp / entries.length : 0

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
  const text = getSentimentText(row)
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
  const sentimentCache = new Map<number, CachedSentiment>()
  for (const row of rows) {
    const text = getSentimentText(row)
    const sent = analyzeSentiment(text)
    sentimentCache.set(row._rowIndex, {
      comparative: sent.comparative,
      emotions: { ...sent.emotions },
      label: sent.label,
    })
  }

  const pages = new Map<string, WikiPage>()
  const pageEntryMap = new Map<string, Set<number>>()
  const pageIndex = new Map<string, { title: string; kind: WikiPageKind }>()
  const pageTags = new Map<string, Set<string>>()

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
      pageTags.set(key, new Set())
    }
    return key
  }

  const rowPageMembership = new Map<number, string[]>()

  for (const row of rows) {
    const memberPages: string[] = []

    if (row.category?.trim()) {
      const key = ensurePage('category', row.category.trim())
      memberPages.push(key)
    }

    for (const tag of parseTags(row.tags)) {
      const key = ensurePage('tag', tag)
      memberPages.push(key)
    }

    for (const person of splitList(row.people)) {
      const key = ensurePage('person', person)
      memberPages.push(key)
    }

    if (row.taskStatus?.trim()) {
      const key = ensurePage('status', row.taskStatus.trim())
      memberPages.push(key)
    }

    for (const theme of extractThemes(row)) {
      const key = ensurePage('theme', theme)
      memberPages.push(key)
    }

    const rowTags = parseTags(row.tags)

    for (const key of memberPages) {
      const entrySet = pageEntryMap.get(key)!
      if (!entrySet.has(row._rowIndex)) {
        entrySet.add(row._rowIndex)
        pages.get(key)!.entries.push(row)
        const tagSet = pageTags.get(key)!
        for (const t of rowTags) tagSet.add(t)
      }
    }

    rowPageMembership.set(row._rowIndex, memberPages)
  }

  for (const [, page] of pages) {
    page.stats = computePageStats(page.entries, sentimentCache)
  }

  for (const [key, entrySet] of pageEntryMap) {
    const page = pages.get(key)
    if (!page) continue
    const related: WikiPage['relatedPages'] = []
    for (const [otherKey, otherSet] of pageEntryMap) {
      if (otherKey === key) continue
      let shared = 0
      for (const idx of entrySet) {
        if (otherSet.has(idx)) shared++
      }
      if (shared > 0) {
        const meta = pageIndex.get(otherKey)
        if (meta) {
          related.push({ key: otherKey, title: meta.title, kind: meta.kind, sharedCount: shared })
        }
      }
    }
    page.relatedPages = related.sort((a, b) => b.sharedCount - a.sharedCount).slice(0, 20)
  }

  // Build connections using inverted index instead of O(P^2) pair iteration
  const connectionMap = new Map<string, { shared: number }>()

  for (const [, memberPages] of rowPageMembership) {
    if (memberPages.length < 2) continue
    // Cap per-row pairs to avoid blowup from rows with many memberships
    const capped = memberPages.length > 20 ? memberPages.slice(0, 20) : memberPages
    for (let i = 0; i < capped.length; i++) {
      for (let j = i + 1; j < capped.length; j++) {
        const a = capped[i] < capped[j] ? capped[i] : capped[j]
        const b = capped[i] < capped[j] ? capped[j] : capped[i]
        const connKey = `${a}|${b}`
        const existing = connectionMap.get(connKey)
        if (existing) {
          existing.shared++
        } else {
          connectionMap.set(connKey, { shared: 1 })
        }
      }
    }
  }

  const connections: WikiConnection[] = []
  for (const [connKey, { shared }] of connectionMap) {
    const [keyA, keyB] = connKey.split('|')
    const metaA = pageIndex.get(keyA)
    const metaB = pageIndex.get(keyB)
    if (!metaA || !metaB) continue

    const tagsA = pageTags.get(keyA)
    const tagsB = pageTags.get(keyB)
    const sharedTags: string[] = []
    if (tagsA && tagsB) {
      for (const t of tagsA) {
        if (tagsB.has(t)) sharedTags.push(t)
      }
    }

    connections.push({
      from: keyA,
      to: keyB,
      strength: shared + sharedTags.length * 0.5,
      sharedEntries: shared,
      sharedTags,
      relationship: shared >= 5 ? 'strong' : shared >= 2 ? 'moderate' : 'weak',
    })
  }

  connections.sort((a, b) => b.strength - a.strength)

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

  const insights = generateInsights(pages, connections, rows, sentimentCache)
  const timeline = buildTimeline(rows, sentimentCache)

  return { pages, connections, clusters, insights, timeline }
}
