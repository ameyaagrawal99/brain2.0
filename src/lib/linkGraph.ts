import type { BrainRow } from '@/types/sheet'
import type { LinkType, ParsedLink } from '@/types/sheet'

const LINK_TYPE_MAP: Record<string, LinkType> = {
  references:   'references',
  reference:    'references',
  ref:          'references',
  related:      'related',
  'related to': 'related',
  supports:     'supports',
  support:      'supports',
  contradicts:  'contradicts',
  contradict:   'contradicts',
  'is part of': 'partOf',
  'part of':    'partOf',
  partof:       'partOf',
}

function normaliseType(raw: string | undefined): LinkType {
  if (!raw) return 'untyped'
  const key = raw.trim().toLowerCase()
  return LINK_TYPE_MAP[key] ?? 'untyped'
}

/**
 * Parse [[Title]] or [[Title|type]] from a single wiki-link match.
 * Returns { title, type, raw }.
 */
export function parseLinkToken(inner: string): ParsedLink {
  const pipeIdx = inner.indexOf('|')
  if (pipeIdx === -1) {
    const title = inner.trim()
    return { title, type: 'untyped', raw: `[[${inner}]]` }
  }
  const title = inner.slice(0, pipeIdx).trim()
  const typeStr = inner.slice(pipeIdx + 1).trim()
  return { title, type: normaliseType(typeStr), raw: `[[${inner}]]` }
}

/** Extract all [[Title]] / [[Title|type]] references from a text string */
export function extractWikiLinks(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => {
    const inner = m.slice(2, -2)
    const pipeIdx = inner.indexOf('|')
    return pipeIdx === -1 ? inner.trim() : inner.slice(0, pipeIdx).trim()
  })
}

/** Extract typed link objects from a text string */
export function extractTypedLinks(text: string): ParsedLink[] {
  if (!text) return []
  const matches = text.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => parseLinkToken(m.slice(2, -2)))
}

/** Format a link back to [[Title|type]] or [[Title]] if untyped */
export function formatLink(title: string, type: LinkType = 'untyped'): string {
  if (type === 'untyped') return `[[${title}]]`
  return `[[${title}|${type}]]`
}

/** Human-readable label for a LinkType */
export function linkTypeLabel(type: LinkType): string {
  switch (type) {
    case 'references':  return 'references'
    case 'related':     return 'related to'
    case 'supports':    return 'supports'
    case 'contradicts': return 'contradicts'
    case 'partOf':      return 'is part of'
    case 'untyped':
    default:            return ''
  }
}

/** Find all rows directly linked from `row`, returning typed link objects */
export interface LinkedRowWithType {
  row: BrainRow
  type: LinkType
}

/** A typed edge between two entries (used in graph views and edge traversal) */
export interface LinkEdge {
  sourceIndex: number // _rowIndex of the entry that has the link
  targetTitle: string // title of the linked entry
  type: LinkType // relationship type
  kind: 'explicit' | 'mention' // explicit = links field; mention = body text
}

/** Build a list of typed link edges from all rows */
export function buildLinkEdges(rows: BrainRow[]): LinkEdge[] {
  const edges: LinkEdge[] = []
  rows.forEach((row) => {
    // Explicit typed links from the links field
    extractTypedLinks(row.links ?? '').forEach((link) => {
      edges.push({
        sourceIndex: row._rowIndex,
        targetTitle: link.title,
        type: link.type,
        kind: 'explicit',
      })
    })
    // Plain [[Title]] mentions in body text (always untyped)
    const bodyTitles = extractWikiLinks(
      [row.original, row.rewritten, row.actionItems].join('\n'),
    )
    bodyTitles.forEach((title) => {
      edges.push({
        sourceIndex: row._rowIndex,
        targetTitle: title,
        type: 'untyped',
        kind: 'mention',
      })
    })
  })
  return edges
}

/** Find all rows directly linked via [[Title]] in any text field of `row` */
export function resolveLinkedRows(
  row: BrainRow,
  allRows: BrainRow[],
): BrainRow[] {
  return resolveLinkedRowsTyped(row, allRows).map((x) => x.row)
}

export function resolveLinkedRowsTyped(
  row: BrainRow,
  allRows: BrainRow[],
): LinkedRowWithType[] {
  const titleMap = new Map(allRows.map((r) => [r.title?.toLowerCase().trim(), r]))
  const fields = [row.original, row.rewritten, row.actionItems, row.links]
  const seen = new Set<number>()
  const result: LinkedRowWithType[] = []

  for (const field of fields) {
    for (const link of extractTypedLinks(field ?? '')) {
      const found = titleMap.get(link.title.toLowerCase())
      if (!found || found._rowIndex === row._rowIndex || seen.has(found._rowIndex)) continue
      seen.add(found._rowIndex)
      result.push({ row: found, type: link.type })
    }
  }
  return result
}

/**
 * BFS traversal following [[Title]] links up to `maxDepth` hops.
 * Circular graphs are safe — a `seen` Set prevents infinite loops.
 */
export function expandChain(
  startRows: BrainRow[],
  allRows: BrainRow[],
  maxDepth = 3,
  maxEntries = 50,
): BrainRow[] {
  const seen = new Set<number>(startRows.map((r) => r._rowIndex))
  const result: BrainRow[] = []
  let frontier = startRows

  for (let depth = 0; depth < maxDepth && frontier.length > 0 && result.length < maxEntries; depth++) {
    const next: BrainRow[] = []
    for (const row of frontier) {
      for (const { row: r } of resolveLinkedRowsTyped(row, allRows)) {
        if (!seen.has(r._rowIndex)) {
          seen.add(r._rowIndex)
          result.push(r)
          next.push(r)
          if (result.length >= maxEntries) break
        }
      }
      if (result.length >= maxEntries) break
    }
    frontier = next
  }
  return result
}

/**
 * Build a map of graph edges for GraphView:
 */
export const buildGraphEdges = buildLinkEdges
