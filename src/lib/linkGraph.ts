import type { BrainRow } from '@/types/sheet'

/** Extract all [[Title]] references from a text string */
export function extractWikiLinks(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => m.slice(2, -2).trim())
}

/** Find all rows directly linked via [[Title]] in any text field of `row` */
export function resolveLinkedRows(row: BrainRow, allRows: BrainRow[]): BrainRow[] {
  const titleMap = new Map(allRows.map((r) => [r.title?.toLowerCase().trim(), r]))
  const fields = [row.original, row.rewritten, row.actionItems, row.links]
  const titles = fields.flatMap((f) => extractWikiLinks(f ?? ''))
  const seen = new Set<number>()
  return titles.flatMap((title) => {
    const found = titleMap.get(title.toLowerCase())
    if (!found || found._rowIndex === row._rowIndex || seen.has(found._rowIndex)) return []
    seen.add(found._rowIndex)
    return [found]
  })
}

/**
 * BFS traversal following [[Title]] links up to `maxDepth` hops.
 * Returns all reachable rows (the startRows themselves are excluded from result).
 * Circular graphs are safe — a `seen` Set prevents infinite loops.
 */
export function expandChain(
  startRows: BrainRow[],
  allRows: BrainRow[],
  maxDepth = 3,
): BrainRow[] {
  const seen = new Set<number>(startRows.map((r) => r._rowIndex))
  const result: BrainRow[] = []
  let frontier = startRows

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: BrainRow[] = []
    for (const row of frontier) {
      const linked = resolveLinkedRows(row, allRows)
      for (const r of linked) {
        if (!seen.has(r._rowIndex)) {
          seen.add(r._rowIndex)
          result.push(r)
          next.push(r)
        }
      }
    }
    frontier = next
  }

  return result
}
