import type { BrainRow, LinkType } from '@/types/sheet'

export interface ParsedLink {
  title: string
  type:  LinkType
  raw:   string   // the original [[Title]] or [[Title|type]] string
}

/** Map string alias → canonical LinkType */
const TYPE_MAP: Record<string, LinkType> = {
  references:  'references',
  reference:   'references',
  ref:         'references',
  related:     'related',
  'related to':'related',
  supports:    'supports',
  support:     'supports',
  contradicts: 'contradicts',
  contradict:  'contradicts',
  opposes:     'contradicts',
  partof:      'partOf',
  'part of':   'partOf',
  part:        'partOf',
  child:       'partOf',
}

function parseType(raw: string): LinkType {
  const k = raw.trim().toLowerCase().replace(/[\s-]/g, ' ')
  return TYPE_MAP[k] ?? 'untyped'
}

/** Extract all [[Title]] or [[Title|type]] links from text, with typed info */
export function extractParsedLinks(text: string): ParsedLink[] {
  if (!text) return []
  const matches = text.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => {
    const inner = m.slice(2, -2)
    const pipeIdx = inner.indexOf('|')
    if (pipeIdx === -1) {
      return { title: inner.trim(), type: 'untyped' as LinkType, raw: m }
    }
    const title = inner.slice(0, pipeIdx).trim()
    const type  = parseType(inner.slice(pipeIdx + 1))
    return { title, type, raw: m }
  })
}

/** Legacy: extract just the titles (backwards-compatible) */
export function extractWikiLinks(text: string): string[] {
  return extractParsedLinks(text).map((l) => l.title)
}

/** Serialise a typed link back to [[Title|type]] or [[Title]] */
export function serializeLink(title: string, type: LinkType = 'untyped'): string {
  return type === 'untyped' ? `[[${title}]]` : `[[${title}|${type}]]`
}

/** Find all rows directly linked from `row`, returning typed link objects */
export interface LinkedRowWithType {
  row:  BrainRow
  type: LinkType
}

export function resolveLinkedRowsTyped(row: BrainRow, allRows: BrainRow[]): LinkedRowWithType[] {
  const titleMap = new Map(allRows.map((r) => [r.title?.toLowerCase().trim(), r]))
  const fields = [row.original, row.rewritten, row.actionItems, row.links]
  const seen = new Set<number>()
  const result: LinkedRowWithType[] = []

  for (const field of fields) {
    for (const link of extractParsedLinks(field ?? '')) {
      const found = titleMap.get(link.title.toLowerCase())
      if (!found || found._rowIndex === row._rowIndex || seen.has(found._rowIndex)) continue
      seen.add(found._rowIndex)
      result.push({ row: found, type: link.type })
    }
  }
  return result
}

/** Legacy: find all rows directly linked via [[Title]] */
export function resolveLinkedRows(row: BrainRow, allRows: BrainRow[]): BrainRow[] {
  return resolveLinkedRowsTyped(row, allRows).map((x) => x.row)
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
 * returns array of { source, target, type } where source/target are _rowIndex
 */
export interface GraphEdge {
  source: number
  target: number
  type:   LinkType
}

export function buildGraphEdges(rows: BrainRow[]): GraphEdge[] {
  const titleMap = new Map(rows.map((r) => [r.title?.toLowerCase().trim(), r._rowIndex]))
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const fields = [row.original, row.rewritten, row.actionItems, row.links]
    for (const field of fields) {
      for (const link of extractParsedLinks(field ?? '')) {
        const targetIdx = titleMap.get(link.title.toLowerCase())
        if (targetIdx == null || targetIdx === row._rowIndex) continue
        const key = `${row._rowIndex}-${targetIdx}`
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ source: row._rowIndex, target: targetIdx, type: link.type })
      }
    }
  }
  return edges
}
