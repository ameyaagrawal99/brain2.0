import { useRef, useState } from 'react'
import {
  X, Wand2, Zap, Brain, Tag, CheckSquare, FileText, Sparkles,
  Key, Download, ChevronDown, ChevronUp, RotateCcw, Heading, StopCircle, MousePointerClick, Network, ExternalLink,
  Link2, Check, Trash2, GitMerge,
} from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { InstructionsBox } from '@/components/ui/InstructionsBox'
import { WikiLinkedText } from '@/components/ui/WikiLinkedText'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { useFilters } from '@/hooks/useFilters'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { expandChain, formatLink } from '@/lib/linkGraph'
import { toLocalISODate } from '@/lib/date'
import toast from 'react-hot-toast'
import type { BrainRow, LinkType } from '@/types/sheet'
import { LINK_TYPE_LABELS } from '@/types/sheet'

type AIMode = 'quick' | 'bulk' | 'digest' | 'chat' | 'relate' | 'export'

interface RelatedEntry { row: BrainRow; reason: string; score?: number }

interface LinkSuggestion {
  a:            BrainRow
  b:            BrainRow
  reason:       string
  score:        number
  suggestedType: LinkType
  selectedType: LinkType
}

/* ─── Linked-context helpers ─────────────────────────────────────────── */

/** Resolve [[Title]] references in all text fields of a row and return the linked BrainRows. */
function resolveLinkedRows(row: BrainRow, allRows: BrainRow[]): BrainRow[] {
  const titleMap = new Map<string, BrainRow>()
  allRows.forEach((r) => { if (r.title?.trim()) titleMap.set(r.title.toLowerCase().trim(), r) })
  const found = new Map<number, BrainRow>()
  const WIKI = /\[\[([^\]]+)\]\]/g
  const allText = [row.links, row.original, row.rewritten, row.actionItems].join('\n')
  let m: RegExpExecArray | null
  while ((m = WIKI.exec(allText)) !== null) {
    const linked = titleMap.get(m[1].trim().toLowerCase())
    if (linked && linked._rowIndex !== row._rowIndex) found.set(linked._rowIndex, linked)
  }
  return [...found.values()]
}

/** Expand a list of rows by one hop of links (deduped). */
function expandWithLinked(rows: BrainRow[], allRows: BrainRow[]): BrainRow[] {
  const seen = new Set(rows.map((r) => r._rowIndex))
  const expanded = [...rows]
  rows.forEach((r) => {
    resolveLinkedRows(r, allRows).forEach((linked) => {
      if (!seen.has(linked._rowIndex)) {
        seen.add(linked._rowIndex)
        expanded.push(linked)
      }
    })
  })
  return expanded
}

/* ─── Bulk enhance options ───────────────────────────────────────────── */

/** Per-field scope for smart bulk enhancement.
 *  off      → skip this field entirely
 *  missing  → only process entries that don't have this field yet
 *  all      → process every entry in the global scope (may overwrite)
 */
type FieldScope = 'off' | 'missing' | 'all'

interface BulkFieldOptions {
  title:    FieldScope
  rewrite:  FieldScope
  tags:     FieldScope
  category: FieldScope
  actions:  FieldScope
}

type BulkScope = 'unenhanced' | 'all' | 'filtered' | 'selected'

/** Returns true if the row already has a value for the given field */
function fieldHasValue(row: BrainRow, field: keyof BulkFieldOptions): boolean {
  switch (field) {
    case 'title':    return !!row.title?.trim()
    case 'rewrite':  return !!row.rewritten?.trim()
    case 'tags':     return !!row.tags?.trim()
    case 'category': return !!row.category?.trim()
    case 'actions':  return !!row.actionItems?.trim()
  }
}

/** Returns the list of fields that actually need enhancement for this row */
function getFieldsToGenerate(row: BrainRow, opts: BulkFieldOptions): (keyof BulkFieldOptions)[] {
  return (['title', 'rewrite', 'tags', 'category', 'actions'] as const).filter((f) => {
    if (opts[f] === 'off') return false
    if (opts[f] === 'missing') return !fieldHasValue(row, f)
    return true // 'all'
  })
}

/* ─── Export helpers ─────────────────────────────────────────────────── */

function exportMarkdown(rows: BrainRow[]): string {
  const lines: string[] = ['# Brain 2.0 — Export', `> Generated ${new Date().toLocaleString()}`, '']
  for (const r of rows) {
    lines.push(`## ${r.title || 'Untitled'}`)
    if (r.category) lines.push(`**Category:** ${r.category}`)
    if (r.dueDate)  lines.push(`**Due:** ${r.dueDate}`)
    if (r.tags)     lines.push(`**Tags:** ${r.tags}`)
    lines.push('')
    if (r.rewritten) lines.push(r.rewritten)
    else if (r.original) lines.push(r.original)
    if (r.actionItems) {
      lines.push('', '**Action items:**')
      r.actionItems.split('\n').filter(Boolean).forEach((item) =>
        lines.push(`- ${item.replace(/^[-*•]\s*/, '')}`)
      )
    }
    lines.push('', '---', '')
  }
  return lines.join('\n')
}

function exportCSV(rows: BrainRow[]): string {
  const headers = ['Title', 'Category', 'Tags', 'Original', 'Rewritten', 'Action Items', 'Due Date', 'Task Status', 'Media URL', 'Created At']
  const escape  = (v: string | undefined) => `"${(v || '').replace(/"/g, '""')}"`
  const csvRows = rows.map((r) => [
    escape(r.title),
    escape(r.category),
    escape(r.tags),
    escape(r.original),
    escape(r.rewritten),
    escape(r.actionItems),
    escape(r.dueDate),
    escape(r.taskStatus),
    escape(r.mediaUrl),
    escape(r.createdAt),
  ].join(','))
  return [headers.join(','), ...csvRows].join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function AIPanel() {
  const showAIPanel        = useBrainStore((s) => s.showAIPanel)
  const setShowAIPanel     = useBrainStore((s) => s.setShowAIPanel)
  const settings           = useBrainStore((s) => s.settings)
  const rows               = useBrainStore((s) => s.rows)
  const aiInstructions     = useBrainStore((s) => s.aiInstructions)
  const updateAiInstructions = useBrainStore((s) => s.updateAiInstructions)
  const lastBulkRows       = useBrainStore((s) => s.lastBulkRows)
  const selectedCardIndices = useBrainStore((s) => s.selectedCardIndices)
  const setSelectionMode    = useBrainStore((s) => s.setSelectionMode)
  const clearCardSelection  = useBrainStore((s) => s.clearCardSelection)
  const { saveRow, undoBulk, setLastBulkRows } = useSheetSync()
  const { run: runAI, loading: aiLoading, abort: abortAI } = useAI()
  const { run: runRelate, loading: relateLoading }         = useAI()
  const { run: runLinks,  loading: linksLoading }          = useAI()
  const stopRef = useRef(false)
  const { filteredRows } = useFilters()

  const [mode, setMode]               = useState<AIMode>('quick')
  const [quickText, setQuickText]     = useState('')
  const [quickResult, setQuickResult] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkPreviewRows, setBulkPreviewRows] = useState<BrainRow[] | null>(null)
  const [digest, setDigest]           = useState<string | null>(null)
  const [chatInput, setChatInput]     = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [relateQuery, setRelateQuery] = useState('')
  const [relateResults, setRelateResults] = useState<RelatedEntry[]>([])
  const [relatePage, setRelatePage]       = useState(0)
  const [selectedRelateRows, setSelectedRelateRows] = useState<Set<number>>(new Set())
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([])
  const [selectedLinkKeys, setSelectedLinkKeys] = useState<Set<string>>(new Set())
  const [weakerExpanded, setWeakerExpanded] = useState(false)
  const [linkPage, setLinkPage] = useState(0)
  const [useClusterContext, setUseClusterContext] = useState(false)
  const RELATE_PAGE_SIZE = 5
  const LINK_PAGE_SIZE = 10

  // Bulk options (component-level state — no need to persist)
  const [bulkFieldOptions, setBulkFieldOptions] = useState<BulkFieldOptions>({
    title: 'missing', rewrite: 'missing', tags: 'missing', category: 'missing', actions: 'missing',
  })
  const [bulkScope, setBulkScope]       = useState<BulkScope>('all')
  const [bulkInstOpen, setBulkInstOpen] = useState(false)
  const [showBulkOptions, setShowBulkOptions] = useState(false)

  // Export tab state
  const [exportFormat, setExportFormat] = useState<'md' | 'csv'>('md')
  const [exportScope,  setExportScope]  = useState<'all' | 'filtered'>('filtered')

  if (!showAIPanel) return null

  /* ── Quick AI ── */
  async function handleQuickProcess(action: 'rewrite' | 'tags' | 'actions' | 'title' | 'all') {
    if (!quickText.trim()) { toast.error('Enter some text first'); return }
    const result = await runAI(action, quickText, {
      systemInstruction: aiInstructions.quick,
    })
    const out = action === 'all'
      ? [result.title && 'Title: ' + result.title, result.rewritten, result.tags && 'Tags: ' + result.tags, result.actionItems].filter(Boolean).join('\n\n')
      : (result.title || result.rewritten || result.tags || result.actionItems || 'No result')
    setQuickResult(out || null)
  }

  /* ── Bulk enhance ── */
  function getBulkRows(): BrainRow[] {
    const hasContent = (r: BrainRow) => !!(r.original?.trim() || r.title?.trim())
    let base: BrainRow[]
    if (bulkScope === 'unenhanced') base = rows.filter((r) => !r.rewritten && hasContent(r))
    else if (bulkScope === 'filtered')   base = filteredRows.filter(hasContent)
    else if (bulkScope === 'selected')   base = rows.filter((r) => selectedCardIndices.includes(r._rowIndex) && hasContent(r))
    else base = rows.filter(hasContent) // 'all'

    // Only include rows that actually need at least one field enhanced
    return base.filter((row) => getFieldsToGenerate(row, bulkFieldOptions).length > 0)
  }

  function handlePickCards() {
    setSelectionMode(true)
    setShowAIPanel(false)
  }

  async function handleBulkEnhance() {
    if (!bulkPreviewRows) {
      const toPreview = getBulkRows()
      if (!toPreview.length) { toast('No entries need enhancement with the current settings'); return }
      setBulkPreviewRows(toPreview)
      toast('Review the bulk preview, then apply when ready')
      return
    }

    const toProcess = bulkPreviewRows
    if (!toProcess.length) { toast('No entries need enhancement with the current settings'); return }
    stopRef.current = false
    setBulkPreviewRows(null)
    setBulkProgress({ done: 0, total: toProcess.length })
    const touchedIndices: number[] = []
    let done = 0

    for (const row of toProcess) {
      if (stopRef.current) break

      try {
        // Determine exactly which fields this row needs (respects per-field scope)
        const fieldsNeeded = getFieldsToGenerate(row, bulkFieldOptions)
        if (!fieldsNeeded.length) { done++; setBulkProgress({ done, total: toProcess.length }); continue }

        const wantedKeys: string[] = []
        if (fieldsNeeded.includes('title'))    wantedKeys.push('title (concise 5-10 word title for the note)')
        if (fieldsNeeded.includes('rewrite'))  wantedKeys.push('rewritten (polished version of the note, first-person journal style)')
        if (fieldsNeeded.includes('tags'))     wantedKeys.push('tags (comma-separated lowercase keywords, 3-7 tags)')
        if (fieldsNeeded.includes('category')) wantedKeys.push('category (one word or short phrase), subCategory (optional sub-topic)')
        if (fieldsNeeded.includes('actions'))  wantedKeys.push('actionItems (numbered list of action items, or empty string if none)')

        let result
        if (fieldsNeeded.length === 5) {
          // All fields — use the optimised 'all' prompt
          result = await runAI('all', row.original || row.title, {
            systemInstruction: aiInstructions.bulk,
          })
        } else {
          const customPrompt = `Analyze this journal note and return a JSON object with ONLY these keys: ${wantedKeys.join('; ')}. Output only valid JSON.\n\n${row.original || row.title}`
          result = await runAI('all', customPrompt, {
            systemInstruction: aiInstructions.bulk,
          })
        }

        if (stopRef.current) break

        const fields: Record<string, string> = {}
        if (fieldsNeeded.includes('title')    && result.title)       fields.title       = result.title
        if (fieldsNeeded.includes('rewrite')  && result.rewritten)   fields.rewritten   = result.rewritten
        if (fieldsNeeded.includes('tags')     && result.tags)        fields.tags        = result.tags
        if (fieldsNeeded.includes('category') && result.category)    fields.category    = result.category
        if (fieldsNeeded.includes('category') && result.subCategory) fields.subCategory = result.subCategory
        if (fieldsNeeded.includes('actions')  && result.actionItems) fields.actionItems = result.actionItems

        if (Object.keys(fields).length) {
          await saveRow(row._rowIndex, fields, 'AI: Enhance')
          touchedIndices.push(row._rowIndex)
        }
      } catch { /* skip failed rows */ }
      done++
      setBulkProgress({ done, total: toProcess.length })
    }

    setLastBulkRows(touchedIndices)
    if (stopRef.current) {
      toast(`Enhancement stopped — ${touchedIndices.length} of ${toProcess.length} entries processed`)
    } else {
      toast.success(`Enhanced ${touchedIndices.length} entries!`)
    }
    stopRef.current = false
    setBulkProgress(null)
  }

  function handleStopBulk() {
    stopRef.current = true
    abortAI()
  }

  /* ── Digest ── */
  async function handleGenerateDigest() {
    const base = filteredRows.slice(0, 20)
    if (!base.length) { toast.error('No entries to summarize'); return }

    let sample: BrainRow[]
    let contextNote: string
    if (useClusterContext) {
      const chainExpanded = expandChain(base, rows, 3, 25)
      const combined = [...base]
      const seenIdx = new Set(base.map((r) => r._rowIndex))
      chainExpanded.forEach((r) => { if (!seenIdx.has(r._rowIndex)) combined.push(r) })
      sample = combined.slice(0, 25)
      const clusterCount = sample.length - base.length
      contextNote = clusterCount > 0 ? ` (including ${clusterCount} cluster-linked entries, depth 3)` : ''
    } else {
      sample = expandWithLinked(base, rows).slice(0, 30)
      const linkedCount = sample.length - base.length
      contextNote = linkedCount > 0 ? ` (including ${linkedCount} linked entries for context)` : ''
    }

    const context = sample.map((r, i) =>
      `${i + 1}. [${r.category}] ${r.title}: ${(r.rewritten || r.original || '').slice(0, 200)}`
    ).join('\n')
    const prompt = `You are a personal assistant. Here are recent journal entries${contextNote}:\n\n${context}\n\nWrite a thoughtful weekly digest (3-5 sentences): key themes, accomplishments, patterns, and suggested focus for the week.`
    const result = await runAI('rewrite', prompt, {
      systemInstruction: aiInstructions.digest,
    })
    setDigest(result.rewritten || 'Could not generate digest')
  }

  /* ── Chat ── */
  async function handleChat() {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatInput('')
    setChatHistory((h) => [...h, { role: 'user', text: userMsg }])
    // Keyword-score to find most relevant context entries
    const words = userMsg.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const scored = rows.map((r) => {
      const text = [r.title, r.category, r.tags, r.rewritten, r.original].join(' ').toLowerCase()
      const score = words.reduce((s, w) => s + (text.split(w).length - 1), 0)
      return { r, score }
    }).sort((a, b) => b.score - a.score)

    let contextRows: BrainRow[]
    if (useClusterContext) {
      const topRows = scored.slice(0, 10).map(({ r }) => r)
      const chainExpanded = expandChain(topRows, rows, 3, 25)
      const combined = [...topRows]
      const seenIdx = new Set(topRows.map((r) => r._rowIndex))
      chainExpanded.forEach((r) => { if (!seenIdx.has(r._rowIndex)) combined.push(r) })
      contextRows = combined.slice(0, 25)
    } else {
      const topRows = scored.slice(0, 15).map(({ r }) => r)
      contextRows = expandWithLinked(topRows, rows).slice(0, 30)
    }

    const context = contextRows.map((r) =>
      `[${r.category || 'General'}] ${r.title}: ${(r.rewritten || r.original || '').slice(0, 200)}`
    ).join('\n')
    const titles = rows.map((r) => r.title).filter(Boolean).slice(0, 50).join(', ')
    const prompt = `You are an AI assistant with access to the user's personal knowledge base.

IMPORTANT: When referencing specific entries from the user's notes, always wrap the entry title in double brackets like [[Entry Title]]. This makes them clickable.

Available entry titles (for reference): ${titles}

Most relevant entries for this question${useClusterContext ? ` (cluster context: ${contextRows.length} entries)` : ''}:
${context}

User question: ${userMsg}

Answer helpfully and specifically. Reference relevant entries using [[Entry Title]] format when applicable.`
    const result = await runAI('rewrite', prompt, {
      systemInstruction: aiInstructions.chat,
    })
    setChatHistory((h) => [...h, { role: 'ai', text: result.rewritten || 'No response' }])
  }

  /* ── Relate ── */
  async function handleRelate() {
    if (!relateQuery.trim()) return
    setRelatePage(0)
    setSelectedRelateRows(new Set())

    // Keyword-pre-score entries and take top 30 as candidates
    const words = relateQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const candidates = words.length
      ? rows.map((r) => {
          const text = [r.title, r.category, r.tags, r.rewritten, r.original].join(' ').toLowerCase()
          const score = words.reduce((s, w) => s + (text.split(w).length - 1), 0)
          return { r, score }
        }).sort((a, b) => b.score - a.score).slice(0, 30).map(({ r }) => r)
      : rows.slice(0, 30)

    const pool = candidates.map((r, i) =>
      `${i + 1}. "${r.title}" [${r.category || 'General'}]: ${(r.rewritten || r.original || '').slice(0, 120)}`
    ).join('\n')

    const prompt = `The user wants to find entries related to the following query: "${relateQuery}"

Here are candidate entries from the knowledge base:
${pool}

Return a JSON array of the most related entries (up to 15). Format:
[{"title":"exact title from list","reason":"1 short sentence why it's related","score":0-100}]
Where score is relevance 0-100. Output only valid JSON, no other text.`

    const result = await runRelate('rewrite', prompt, {
      systemInstruction: aiInstructions.relate || undefined,
    })
    const raw = result.rewritten || ''
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON')
      const parsed = JSON.parse(jsonMatch[0]) as { title: string; reason: string; score?: number }[]
      const titleMap = new Map(rows.map((r) => [r.title?.toLowerCase().trim(), r]))
      const matched: RelatedEntry[] = parsed.flatMap((item) => {
        const row = titleMap.get(item.title?.toLowerCase().trim() ?? '')
        if (!row) return []
        return [{ row, reason: item.reason, score: item.score }]
      })
      setRelateResults(matched)
      if (!matched.length) toast.error('No matching entries found')
    } catch {
      toast.error('Could not parse AI response')
    }
  }

  /* ── Link Suggestions ── */
  async function handleGenerateLinkSuggestions() {
    const unlinkableRows = rows.filter((r) => r.title?.trim() && (r.original || r.rewritten))
    if (unlinkableRows.length < 2) { toast.error('Need at least 2 entries with content'); return }

    const SCOPED = unlinkableRows.length > 50
    const candidates = SCOPED
      ? filteredRows.filter((r) => r.title?.trim() && (r.original || r.rewritten)).slice(0, 50)
      : unlinkableRows.slice(0, 50)

    if (candidates.length < 2) { toast.error('Not enough visible entries to analyse'); return }

    if (SCOPED) {
      toast(`Analysing ${candidates.length} visible entries (knowledge base > 50)`, { icon: 'ℹ️', duration: 3000 })
    }

    setLinkSuggestions([])
    setSelectedLinkKeys(new Set())
    setLinkPage(0)

    const entryList = candidates.map((r, i) =>
      `${i + 1}. [${r.category || 'General'}] "${r.title}" — ${(r.rewritten || r.original || '').slice(0, 100)}`
    ).join('\n')

    const validTypes = Object.keys(LINK_TYPE_LABELS).join(' | ')

    const prompt = `You are analyzing a personal knowledge base. Find up to 20 pairs of entries that would benefit from being wiki-linked (shared themes, topics, people, or context).

Entries:
${entryList}

Return ONLY a valid JSON array (no explanation, no markdown):
[{"a":"exact title A","b":"exact title B","score":0.85,"reason":"one sentence why they should be linked","suggestedType":"related"}]

Rules:
- score: float 0-1 (1 = extremely strong connection)
- suggestedType must be one of: ${validTypes}
- Include 20 pairs ordered by score descending`

    const result = await runLinks('rewrite', prompt, { maxTokens: 1600 })
    const raw = result.rewritten || ''
    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error()
      const parsed = JSON.parse(match[0]) as { a: string; b: string; score?: number; reason: string; suggestedType?: string }[]
      // Use candidate map (scoped set) so title resolution stays within the analysed batch
      const titleMap = new Map(candidates.map((r) => [r.title?.toLowerCase().trim(), r]))
      const validLinkTypes = new Set<string>(Object.keys(LINK_TYPE_LABELS))

      const seenKeys = new Set<string>()
      const suggestions: LinkSuggestion[] = parsed.flatMap((item) => {
        const rowA = titleMap.get(item.a?.toLowerCase().trim())
        const rowB = titleMap.get(item.b?.toLowerCase().trim())
        if (!rowA || !rowB || rowA._rowIndex === rowB._rowIndex) return []
        // Deduplicate symmetric pairs (A→B same as B→A) using canonical key
        const [lo, hi] = [rowA._rowIndex, rowB._rowIndex].sort((x, y) => x - y)
        const ck = `${lo}-${hi}`
        if (seenKeys.has(ck)) return []
        seenKeys.add(ck)
        const aLinks = rowA.links || ''
        const bLinks = rowB.links || ''
        const alreadyLinked = aLinks.includes(`[[${rowB.title}`) || bLinks.includes(`[[${rowA.title}`)
        if (alreadyLinked) return []
        const score = typeof item.score === 'number' ? Math.max(0, Math.min(1, item.score)) : 0.5
        const rawType = (item.suggestedType ?? 'related').toLowerCase()
        const suggestedType: LinkType = validLinkTypes.has(rawType) ? rawType as LinkType : 'related'
        return [{ a: rowA, b: rowB, reason: item.reason || '', score, suggestedType, selectedType: suggestedType }]
      }).sort((x, y) => y.score - x.score)

      if (!suggestions.length) { toast('All suggested pairs are already linked!'); return }
      setLinkSuggestions(suggestions)
    } catch {
      toast.error('Could not parse AI response')
    }
  }

  /** Canonical (order-independent) key — deduplicates symmetric A→B / B→A pairs */
  function pairKey(s: LinkSuggestion): string {
    const [lo, hi] = [s.a._rowIndex, s.b._rowIndex].sort((x, y) => x - y)
    return `${lo}-${hi}`
  }

  /**
   * Merge new typed link refs into a current links string.
   * Reads from the live store so concurrent saves don't overwrite each other.
   */
  function mergeLinksIntoRow(rowIndex: number, additions: { title: string; type: LinkType }[]): string {
    const liveRow = useBrainStore.getState().rows.find((r) => r._rowIndex === rowIndex)
    let current = (liveRow?.links ?? '').trim()
    for (const { title, type } of additions) {
      if (current.includes(`[[${title}`)) continue
      const ref = formatLink(title, type)
      current = [current, ref].filter(Boolean).join('\n')
    }
    return current
  }

  function handleUpdateLinkType(key: string, type: LinkType) {
    setLinkSuggestions((prev) => prev.map((s) => pairKey(s) === key ? { ...s, selectedType: type } : s))
  }

  async function handleAcceptLinkSuggestion(key: string) {
    const s = linkSuggestions.find((x) => pairKey(x) === key)
    if (!s) return
    try {
      const aLinks = mergeLinksIntoRow(s.a._rowIndex, [{ title: s.b.title, type: s.selectedType }])
      const bLinks = mergeLinksIntoRow(s.b._rowIndex, [{ title: s.a.title, type: s.selectedType }])
      await saveRow(s.a._rowIndex, { links: aLinks }, 'AI: Link suggestion')
      await saveRow(s.b._rowIndex, { links: bLinks }, 'AI: Link suggestion')
      toast.success(`Linked "${s.a.title}" ↔ "${s.b.title}"`)
      setLinkSuggestions((prev) => prev.filter((x) => pairKey(x) !== key))
      setSelectedLinkKeys((prev) => { const next = new Set(prev); next.delete(key); return next })
    } catch {
      toast.error('Failed to save link')
    }
  }

  async function handleApplySelectedLinks() {
    const keys = [...selectedLinkKeys]
    if (!keys.length) return
    const toApply = linkSuggestions.filter((s) => keys.includes(pairKey(s)))
    if (!toApply.length) return

    // Aggregate additions per row to avoid overwrite when multiple pairs share a row
    const byRow = new Map<number, { title: string; type: LinkType }[]>()
    for (const s of toApply) {
      if (!byRow.has(s.a._rowIndex)) byRow.set(s.a._rowIndex, [])
      if (!byRow.has(s.b._rowIndex)) byRow.set(s.b._rowIndex, [])
      byRow.get(s.a._rowIndex)!.push({ title: s.b.title, type: s.selectedType })
      byRow.get(s.b._rowIndex)!.push({ title: s.a.title, type: s.selectedType })
    }

    let saved = 0
    for (const [rowIndex, additions] of byRow) {
      try {
        const merged = mergeLinksIntoRow(rowIndex, additions)
        await saveRow(rowIndex, { links: merged }, 'AI: Link suggestion')
        saved++
      } catch { /* skip failed rows */ }
    }

    const appliedPairs = toApply.length
    toast.success(`Applied ${appliedPairs} pair${appliedPairs !== 1 ? 's' : ''} (${saved} rows updated)`)
    const appliedKeys = new Set(keys)
    setLinkSuggestions((prev) => prev.filter((s) => !appliedKeys.has(pairKey(s))))
    setSelectedLinkKeys(new Set())
    setLinkPage(0)
  }

  function handleAcceptAllStrong() {
    const strongKeys = new Set(linkSuggestions.filter((s) => s.score >= 0.7).map(pairKey))
    setSelectedLinkKeys(strongKeys)
  }

  function handleSkipLinkSuggestion(key: string) {
    setLinkSuggestions((prev) => prev.filter((s) => pairKey(s) !== key))
    setSelectedLinkKeys((prev) => { const next = new Set(prev); next.delete(key); return next })
  }

  /* ── Export ── */
  function handleExport() {
    const data = exportScope === 'all' ? rows : filteredRows
    if (!data.length) { toast.error('No entries to export'); return }
    const ts = toLocalISODate()
    if (exportFormat === 'md') {
      downloadFile(exportMarkdown(data), `brain-export-${ts}.md`, 'text/markdown')
    } else {
      downloadFile(exportCSV(data), `brain-export-${ts}.csv`, 'text/csv')
    }
    toast.success(`Exported ${data.length} entries as ${exportFormat.toUpperCase()}`)
  }

  const MODES: { key: AIMode; label: string; icon: typeof Wand2 }[] = [
    { key: 'quick',  label: 'Quick AI',      icon: Zap },
    { key: 'bulk',   label: 'Bulk Enhance',  icon: Sparkles },
    { key: 'digest', label: 'Digest',        icon: FileText },
    { key: 'chat',   label: 'Chat',          icon: Brain },
    { key: 'relate', label: 'Connections',   icon: Network },
    { key: 'export', label: 'Export',        icon: Download },
  ]

  const hasKey = !!settings.openAiKey

  // Counts for bulk scope display
  const unenhancedCount  = rows.filter((r) => !r.rewritten && (r.original || r.title)).length
  const selectedCount    = rows.filter((r) => selectedCardIndices.includes(r._rowIndex) && (r.original || r.title)).length

  // Count of entries missing each field (for the "Missing only" badge)
  const missingCounts: Record<keyof BulkFieldOptions, number> = {
    title:    rows.filter((r) => (r.original || r.title) && !r.title?.trim()).length,
    rewrite:  rows.filter((r) => (r.original || r.title) && !r.rewritten?.trim()).length,
    tags:     rows.filter((r) => (r.original || r.title) && !r.tags?.trim()).length,
    category: rows.filter((r) => (r.original || r.title) && !r.category?.trim()).length,
    actions:  rows.filter((r) => (r.original || r.title) && !r.actionItems?.trim()).length,
  }

  const bulkScopeCount   = getBulkRows().length

  const fieldScopePill = (field: keyof BulkFieldOptions, scope: FieldScope) => cn(
    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
    bulkFieldOptions[field] === scope
      ? scope === 'off'
        ? 'bg-surface2 text-ink2'
        : 'bg-brand text-white'
      : 'bg-surface2 text-ink3 hover:text-ink hover:bg-hover',
  )

  return (
    <>
      {/* ── Mobile backdrop only (hidden on sm+) ── */}
      <div
        className="fixed inset-0 z-40 bg-black/40 modal-backdrop sm:hidden"
        onClick={() => setShowAIPanel(false)}
      />

      {/* ── Panel: bottom sheet on mobile, right drawer on desktop ── */}
      <div
        className={cn(
          // shared
          'fixed z-50 bg-surface border-border flex flex-col',
          // mobile: bottom sheet
          'inset-x-0 bottom-0 rounded-t-2xl border-t max-h-[88vh]',
          // desktop: right drawer
          'sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:bottom-0',
          'sm:w-[420px] sm:rounded-none sm:rounded-l-2xl',
          'sm:border-t-0 sm:border-l sm:max-h-screen sm:h-screen',
          'animate-slideUp sm:animate-slideInRight',
          'shadow-xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-ink leading-none">AI Features</h2>
              <p className="text-[11px] text-ink3 mt-0.5">{rows.length} entries in your brain</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowAIPanel(false); useBrainStore.getState().setShowSettings(true) }}
              title="Edit global AI instructions in Settings"
              className={cn(
                'h-7 px-2 flex items-center gap-1 rounded-lg text-[10px] font-medium transition-colors',
                aiInstructions.global.trim()
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'text-ink3 hover:bg-hover hover:text-ink',
              )}
            >
              <Sparkles className="w-3 h-3" />
              {aiInstructions.global.trim() ? 'Brain instructions set' : 'Brain instructions'}
            </button>
            <button
              onClick={() => setShowAIPanel(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-border shrink-0 px-1 pt-1 gap-0.5 overflow-x-auto">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0',
                mode === key
                  ? 'bg-surface text-brand border border-border border-b-surface -mb-px'
                  : 'text-ink2 hover:text-ink hover:bg-hover'
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* NO API KEY BANNER — shown for AI tabs, not export */}
          {!hasKey && mode !== 'export' && (
            <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex gap-3">
              <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">OpenAI key not configured</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                  Add your OpenAI API key in Settings to unlock all AI features — rewriting, tagging, bulk enhancement, weekly digest, and chat.
                </p>
                <button
                  onClick={() => { setShowAIPanel(false); useBrainStore.getState().setShowSettings(true) }}
                  className="text-xs font-medium text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                >
                  Open Settings →
                </button>
              </div>
            </div>
          )}

          {/* FEATURE CONTENT — dimmed when no key (except export) */}
          <div className={cn(!hasKey && mode !== 'export' && 'opacity-50 pointer-events-none select-none')}>

            {/* ── QUICK AI ── */}
            {mode === 'quick' && (
              <div className="space-y-4">
                <p className="text-xs text-ink2">Paste any text and run AI on it instantly — no need to open an entry.</p>
                <textarea
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
                  rows={5}
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder="Paste text here..."
                />
                {/* Custom instructions for Quick AI */}
                <InstructionsBox
                  value={aiInstructions.quick}
                  onChange={(v) => updateAiInstructions({ quick: v })}
                  placeholder="e.g. Be concise. Always respond in bullet points."
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { action: 'title'   as const, label: 'Generate title',   icon: Heading },
                    { action: 'rewrite' as const, label: 'Rewrite',          icon: Wand2 },
                    { action: 'tags'    as const, label: 'Generate tags',     icon: Tag },
                    { action: 'actions' as const, label: 'Extract actions',   icon: CheckSquare },
                    { action: 'all'     as const, label: 'Enhance all',       icon: Sparkles },
                  ].map(({ action, label, icon: Icon }) => (
                    <Button key={action} size="sm" variant="outline" onClick={() => handleQuickProcess(action)} loading={aiLoading}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </Button>
                  ))}
                </div>
                {quickResult && (
                  <div className="bg-brand/5 border border-brand/15 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-brand">Result</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(quickResult).then(() => toast.success('Copied!'))}
                        className="text-xs text-ink3 hover:text-ink"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{quickResult}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── BULK ENHANCE ── */}
            {mode === 'bulk' && (
              <div className="space-y-4">

                {/* Info banner */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Bulk AI Enhancement</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Automatically rewrites, tags, and extracts action items for your entries. Costs approx $0.001 per entry.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-2xl font-bold text-ink">{rows.length}</div>
                    <div className="text-xs text-ink3 mt-0.5">Total</div>
                  </div>
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-2xl font-bold text-brand">{rows.filter((r) => r.rewritten).length}</div>
                    <div className="text-xs text-ink3 mt-0.5">Enhanced</div>
                  </div>
                  <div className="bg-surface2 rounded-xl p-3">
                    <div className="text-2xl font-bold text-amber-500">{bulkScopeCount}</div>
                    <div className="text-xs text-ink3 mt-0.5">To Enhance</div>
                  </div>
                </div>

                {/* Enhancement options collapsible */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowBulkOptions((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-ink2 hover:bg-hover transition-colors"
                  >
                    <span>Enhancement options</span>
                    {showBulkOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showBulkOptions && (
                    <div className="border-t border-border bg-surface2 px-4 py-3 space-y-4">

                      {/* Fields to generate — smart per-field scope */}
                      <div>
                        <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-1">Fields to generate</p>
                        <p className="text-[10px] text-ink3 mb-3">
                          Choose <span className="font-medium text-ink2">Missing only</span> to skip entries that already have this field — saves credits.
                        </p>
                        <div className="space-y-3">
                          {([
                            ['title',    'Generate title',       Heading],
                            ['rewrite',  'Rewrite content',      Wand2],
                            ['tags',     'Generate tags',        Tag],
                            ['category', 'Suggest category',     FileText],
                            ['actions',  'Extract action items', CheckSquare],
                          ] as const).map(([key, label, Icon]) => (
                            <div key={key}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Icon className="w-3 h-3 text-ink3 shrink-0" />
                                <span className="text-xs text-ink font-medium">{label}</span>
                                {missingCounts[key] > 0 && (
                                  <span className="text-[10px] text-ink3 ml-auto">{missingCounts[key]} missing</span>
                                )}
                              </div>
                              <div className="flex gap-1 ml-4">
                                {(['off', 'missing', 'all'] as FieldScope[]).map((scope) => (
                                  <button
                                    key={scope}
                                    type="button"
                                    onClick={() => setBulkFieldOptions((o) => ({ ...o, [key]: scope }))}
                                    className={fieldScopePill(key, scope)}
                                  >
                                    {scope === 'off' ? 'Skip' : scope === 'missing' ? 'Missing only' : 'All'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scope */}
                      <div>
                        <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Which entries to include</p>
                        <div className="flex flex-col gap-1.5">
                          {([
                            ['all',        `All entries with content (${rows.filter((r) => r.original || r.title).length})`],
                            ['filtered',   `Current filtered view (${filteredRows.filter((r) => r.original || r.title).length})`],
                            ['selected',   `Selected cards (${selectedCount})`],
                          ] as const).map(([val, label]) => (
                            <label key={val} className="flex items-center gap-2.5 cursor-pointer">
                              <div
                                className={cn(
                                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                  bulkScope === val ? 'border-brand' : 'border-border',
                                )}
                                onClick={() => setBulkScope(val)}
                              >
                                {bulkScope === val && <div className="w-2 h-2 rounded-full bg-brand" />}
                              </div>
                              <span className="text-xs text-ink">{label}</span>
                            </label>
                          ))}
                        </div>
                        {/* Pick cards button — shown when 'selected' scope is active */}
                        {bulkScope === 'selected' && (
                          <button
                            type="button"
                            onClick={handlePickCards}
                            className="mt-2 flex items-center gap-1.5 text-xs text-brand hover:underline"
                          >
                            <MousePointerClick className="w-3.5 h-3.5" />
                            {selectedCount > 0 ? `${selectedCount} cards selected — click to change` : 'Click cards to select them'}
                          </button>
                        )}
                        {bulkScope === 'selected' && selectedCount > 0 && (
                          <button
                            type="button"
                            onClick={clearCardSelection}
                            className="mt-1 text-xs text-ink3 hover:text-ink underline"
                          >
                            Clear selection
                          </button>
                        )}
                      </div>

                      {/* Custom instructions for bulk */}
                      <div>
                        <p className="text-[11px] font-medium text-ink2 uppercase tracking-wide mb-2">Custom instructions</p>
                        <div
                          className={cn(!bulkInstOpen && 'hidden')}
                        />
                        <button
                          type="button"
                          onClick={() => setBulkInstOpen((o) => !o)}
                          className="text-xs text-brand hover:underline mb-1 flex items-center gap-1"
                        >
                          {bulkInstOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {bulkInstOpen ? 'Hide' : 'Add'} context for AI
                          {aiInstructions.bulk.trim() && <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />}
                        </button>
                        {bulkInstOpen && (
                          <textarea
                            rows={2}
                            value={aiInstructions.bulk}
                            onChange={(e) => updateAiInstructions({ bulk: e.target.value })}
                            placeholder="e.g. All entries are about software engineering. Be technical and precise."
                            className="w-full bg-surface border border-border rounded-lg px-2.5 py-2 text-xs text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-brand/40 resize-none leading-relaxed"
                          />
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {bulkProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-ink2">
                      <span>Processing {bulkProgress.done} of {bulkProgress.total}…</span>
                      <span>{Math.round((bulkProgress.done / bulkProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {bulkPreviewRows && !bulkProgress && (
                  <div className="rounded-xl border border-brand/25 bg-brand/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">Bulk preview</p>
                        <p className="text-xs text-ink3">{bulkPreviewRows.length} entries will be processed. No changes have been saved yet.</p>
                      </div>
                      <button onClick={() => setBulkPreviewRows(null)} className="text-xs text-ink3 hover:text-ink">Cancel</button>
                    </div>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {bulkPreviewRows.slice(0, 6).map((row) => (
                        <div key={row._rowIndex} className="flex items-center justify-between gap-2 rounded-lg bg-surface border border-border px-2 py-1.5">
                          <span className="text-xs text-ink truncate">{row.title || 'Untitled'}</span>
                          <span className="text-[10px] text-ink3 shrink-0">{getFieldsToGenerate(row, bulkFieldOptions).join(', ')}</span>
                        </div>
                      ))}
                      {bulkPreviewRows.length > 6 && <p className="text-[10px] text-ink3">+{bulkPreviewRows.length - 6} more</p>}
                    </div>
                  </div>
                )}

                {/* Run / Stop buttons */}
                {bulkProgress ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopBulk}
                    className="w-full justify-center border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Stop ({bulkProgress.done}/{bulkProgress.total} done)
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkEnhance}
                    loading={aiLoading}
                    className="w-full justify-center"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {bulkPreviewRows
                      ? `Apply to ${bulkPreviewRows.length} ${bulkPreviewRows.length === 1 ? 'entry' : 'entries'}`
                      : bulkScopeCount > 0
                      ? `Enhance ${bulkScopeCount} ${bulkScopeCount === 1 ? 'entry' : 'entries'}`
                      : 'Nothing to enhance'}
                  </Button>
                )}

                {/* Undo last bulk */}
                {lastBulkRows.length > 0 && !bulkProgress && (
                  <button
                    onClick={async () => {
                      await undoBulk()
                    }}
                    disabled={aiLoading}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-ink2 hover:text-ink border border-border rounded-lg py-2 hover:bg-hover transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Undo last bulk run ({lastBulkRows.length} {lastBulkRows.length === 1 ? 'entry' : 'entries'})
                  </button>
                )}
              </div>
            )}

            {/* ── WEEKLY DIGEST ── */}
            {mode === 'digest' && (
              <div className="space-y-4">
                <p className="text-xs text-ink2">Generate a weekly digest summarizing your recent entries, key themes, and suggested focus.</p>
                {/* Custom instructions for digest */}
                <InstructionsBox
                  value={aiInstructions.digest}
                  onChange={(v) => updateAiInstructions({ digest: v })}
                  placeholder="e.g. Focus on professional growth and learning milestones."
                />
                {/* Cluster context toggle */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUseClusterContext((v) => !v)}
                      className={cn(
                        'w-8 h-4 rounded-full transition-colors relative shrink-0',
                        useClusterContext ? 'bg-brand' : 'bg-border',
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                        useClusterContext ? 'translate-x-4' : 'translate-x-0.5',
                      )} />
                    </button>
                    <span className="text-xs text-ink2">Use cluster context</span>
                    {useClusterContext && (
                      <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
                        Context: {Math.min(25, filteredRows.slice(0, 20).length + expandChain(filteredRows.slice(0, 20), rows, 3, 25).length)} entries
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleGenerateDigest} loading={aiLoading} className="w-full justify-center">
                  <FileText className="w-3.5 h-3.5" />
                  Generate Digest ({filteredRows.length} entries)
                </Button>
                {digest && (
                  <div className="bg-brand/5 border border-brand/15 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-brand uppercase tracking-wide">Weekly Digest</span>
                      <button onClick={() => navigator.clipboard.writeText(digest).then(() => toast.success('Copied!'))} className="text-xs text-ink3 hover:text-ink">Copy</button>
                    </div>
                    <p className="text-sm text-ink leading-relaxed prose-journal">{digest}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT ── */}
            {mode === 'chat' && (
              <div className="flex flex-col space-y-4">
                <p className="text-xs text-ink2">Ask questions about your notes. AI answers using your entries as context.</p>
                {/* Custom instructions for chat */}
                <InstructionsBox
                  value={aiInstructions.chat}
                  onChange={(v) => updateAiInstructions({ chat: v })}
                  placeholder="e.g. Answer in a friendly tone. Always suggest next steps."
                />
                {/* Cluster context toggle */}
                <div className="flex items-center gap-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => setUseClusterContext((v) => !v)}
                    className={cn(
                      'w-8 h-4 rounded-full transition-colors relative shrink-0',
                      useClusterContext ? 'bg-brand' : 'bg-border',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform',
                      useClusterContext ? 'translate-x-4' : 'translate-x-0.5',
                    )} />
                  </button>
                  <span className="text-xs text-ink2">Use cluster context</span>
                  {useClusterContext && (
                    <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
                      depth 3, up to 25 entries
                    </span>
                  )}
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8 text-ink3 text-sm">
                      <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>Ask anything about your notes</p>
                      <p className="text-xs mt-1 opacity-70">e.g. "What are my pending action items?"</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                        msg.role === 'user'
                          ? 'bg-brand text-white rounded-br-sm'
                          : 'bg-surface2 text-ink rounded-bl-sm'
                      )}>
                        {msg.role === 'ai'
                          ? <WikiLinkedText text={msg.text} className="whitespace-pre-wrap leading-relaxed" />
                          : msg.text
                        }
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface2 rounded-xl rounded-bl-sm px-4 py-2.5">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-ink3 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your notes…"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                  />
                  <Button variant="primary" size="sm" onClick={handleChat} loading={aiLoading}>Send</Button>
                </div>
              </div>
            )}

            {/* ── CONNECTIONS (Find Related + Link Suggest) ── */}
            {mode === 'relate' && (
              <div className="space-y-4">
                <p className="text-xs text-ink2">
                  Find entries related to a topic, or scan the entire knowledge base to discover pairs that should be linked.
                </p>
                <InstructionsBox
                  value={aiInstructions.relate}
                  onChange={(v) => updateAiInstructions({ relate: v })}
                  placeholder="e.g. focus on technical connections, only health topics, ignore personal entries"
                />
                <textarea
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
                  rows={4}
                  value={relateQuery}
                  onChange={(e) => setRelateQuery(e.target.value)}
                  placeholder="e.g. machine learning projects, meetings with Sarah, investment decisions…"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRelate}
                  loading={relateLoading}
                  className="w-full justify-center"
                >
                  <Network className="w-3.5 h-3.5" />
                  Find Related Entries
                </Button>

                {relateResults.length > 0 && (() => {
                  const totalPages = Math.ceil(relateResults.length / RELATE_PAGE_SIZE)
                  const pageResults = relateResults.slice(relatePage * RELATE_PAGE_SIZE, (relatePage + 1) * RELATE_PAGE_SIZE)
                  return (
                    <div className="space-y-3">
                      {/* Header + multi-select toolbar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-medium text-ink2 uppercase tracking-wide">
                          {relateResults.length} related entries found
                        </p>
                        {selectedRelateRows.size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-brand font-medium">{selectedRelateRows.size} selected</span>
                            <button
                              onClick={() => {
                                const links = relateResults
                                  .filter(({ row }) => selectedRelateRows.has(row._rowIndex))
                                  .map(({ row }) => `[[${row.title}]]`)
                                  .join('\n')
                                navigator.clipboard.writeText(links)
                                toast.success('Copied as wiki links — paste in any entry\'s Links field')
                                setSelectedRelateRows(new Set())
                              }}
                              className="text-[10px] px-2 py-1 bg-brand text-white rounded-md hover:bg-brand/80 transition-colors font-medium flex items-center gap-1"
                            >
                              <Link2 className="w-2.5 h-2.5" />
                              Copy as links
                            </button>
                            <button
                              onClick={() => setSelectedRelateRows(new Set())}
                              className="text-[10px] text-ink3 hover:text-ink transition-colors font-medium"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Results for current page */}
                      {pageResults.map(({ row, reason, score }) => (
                        <div
                          key={row._rowIndex}
                          className="bg-surface2 border border-border rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedRelateRows.has(row._rowIndex)}
                              onChange={() => setSelectedRelateRows((prev) => {
                                const next = new Set(prev)
                                next.has(row._rowIndex) ? next.delete(row._rowIndex) : next.add(row._rowIndex)
                                return next
                              })}
                              className="w-3.5 h-3.5 rounded border-border accent-brand shrink-0 mt-0.5 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-ink leading-tight">{row.title}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {score != null && (
                                    <span className={cn(
                                      'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                                      score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-border text-ink3',
                                    )}>
                                      {score}%
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => useBrainStore.getState().openModal(row)}
                                    className="flex items-center gap-1 text-xs text-brand hover:underline font-medium"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Open
                                  </button>
                                </div>
                              </div>
                              {row.category && (
                                <span className="inline-block text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-medium mt-0.5">
                                  {row.category}
                                </span>
                              )}
                              <p className="text-xs text-ink2 leading-relaxed mt-1">{reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => setRelatePage((p) => Math.max(0, p - 1))}
                            disabled={relatePage === 0}
                            className="text-xs px-3 py-1.5 bg-surface2 border border-border rounded-lg disabled:opacity-40 hover:bg-hover transition-colors font-medium"
                          >
                            ← Prev
                          </button>
                          <span className="text-xs text-ink3">
                            {relatePage + 1} / {totalPages}
                          </span>
                          <button
                            onClick={() => setRelatePage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={relatePage >= totalPages - 1}
                            className="text-xs px-3 py-1.5 bg-surface2 border border-border rounded-lg disabled:opacity-40 hover:bg-hover transition-colors font-medium"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {!relateResults.length && !relateLoading && relateQuery.trim() && (
                  <p className="text-xs text-ink3 text-center py-4">Run a search above to find related entries</p>
                )}

                {/* ── Link Suggestions sub-section ── */}
                {(() => {
                  const unlinkableTotal = rows.filter((r) => r.title && (r.original || r.rewritten)).length
                  const SCOPED = unlinkableTotal > 50
                  const strongSuggestions = linkSuggestions.filter((s) => s.score >= 0.4)
                  const weakerSuggestions = linkSuggestions.filter((s) => s.score < 0.4)
                  // "Load more" pattern: show all items up to (linkPage+1)*LINK_PAGE_SIZE
                  const visibleCount = (linkPage + 1) * LINK_PAGE_SIZE
                  const strongPage = strongSuggestions.slice(0, visibleCount)
                  const hasMore = strongSuggestions.length > visibleCount

                  function SuggestionRow({ s }: { s: LinkSuggestion }) {
                    const key = pairKey(s)
                    const scoreColor = s.score >= 0.7 ? 'bg-green-500' : s.score >= 0.4 ? 'bg-amber-500' : 'bg-border'
                    const scorePct = Math.round(s.score * 100)
                    return (
                      <div className="bg-surface2 border border-border rounded-xl p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedLinkKeys.has(key)}
                            onChange={() => setSelectedLinkKeys((prev) => {
                              const next = new Set(prev)
                              next.has(key) ? next.delete(key) : next.add(key)
                              return next
                            })}
                            className="w-3.5 h-3.5 rounded border-border accent-brand shrink-0 mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => useBrainStore.getState().openModal(s.a)}
                                className="text-xs font-semibold text-brand hover:underline max-w-[110px] truncate"
                              >
                                {s.a.title}
                              </button>
                              <Link2 className="w-3 h-3 text-ink3 shrink-0" />
                              <button
                                onClick={() => useBrainStore.getState().openModal(s.b)}
                                className="text-xs font-semibold text-brand hover:underline max-w-[110px] truncate"
                              >
                                {s.b.title}
                              </button>
                              <span className={cn(
                                'ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white',
                                scoreColor,
                              )}>
                                {scorePct}%
                              </span>
                            </div>
                            {/* Score bar */}
                            <div className="h-1 bg-surface rounded-full overflow-hidden mt-1.5">
                              <div className={cn('h-full rounded-full', scoreColor)} style={{ width: `${scorePct}%` }} />
                            </div>
                            <p className="text-[11px] text-ink3 leading-relaxed mt-1.5">{s.reason}</p>
                            {/* Relationship type selector */}
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <GitMerge className="w-3 h-3 text-ink3 shrink-0" />
                              {(Object.keys(LINK_TYPE_LABELS) as LinkType[]).map((lt) => (
                                <button
                                  key={lt}
                                  onClick={() => handleUpdateLinkType(key, lt)}
                                  className={cn(
                                    'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors font-medium',
                                    s.selectedType === lt
                                      ? 'bg-brand text-white border-brand'
                                      : 'border-border text-ink3 hover:border-brand/50 hover:text-ink',
                                  )}
                                >
                                  {LINK_TYPE_LABELS[lt]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 pl-5">
                          <button
                            onClick={() => handleAcceptLinkSuggestion(key)}
                            className="flex items-center gap-1 text-xs font-medium text-white bg-brand rounded-lg px-2.5 py-1 hover:bg-brand/90 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Link
                          </button>
                          <button
                            onClick={() => handleSkipLinkSuggestion(key)}
                            className="flex items-center gap-1 text-xs font-medium text-ink3 bg-surface border border-border rounded-lg px-2.5 py-1 hover:text-ink hover:bg-hover transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Skip
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-ink2">Suggest Links</p>
                          <p className="text-[11px] text-ink3 mt-0.5">
                            {SCOPED
                              ? `Scoped to filtered view (${filteredRows.filter((r) => r.title && (r.original || r.rewritten)).length} entries)`
                              : 'Scan all entries and find pairs that should be linked.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[10px] text-ink3">
                          <span>{unlinkableTotal} entries</span>
                          {linkSuggestions.length > 0 && (
                            <span className="bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold">
                              {linkSuggestions.length} pending
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateLinkSuggestions}
                        loading={linksLoading}
                        className="w-full justify-center"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {linkSuggestions.length > 0 ? 'Refresh suggestions' : 'Find link suggestions'}
                      </Button>

                      {linkSuggestions.length > 0 && (
                        <div className="space-y-3">
                          {/* Multi-select toolbar */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (selectedLinkKeys.size === linkSuggestions.length) {
                                    setSelectedLinkKeys(new Set())
                                  } else {
                                    setSelectedLinkKeys(new Set(linkSuggestions.map(pairKey)))
                                  }
                                }}
                                className="text-[10px] text-ink3 hover:text-ink transition-colors font-medium"
                              >
                                {selectedLinkKeys.size === linkSuggestions.length ? 'Deselect all' : 'Select all'}
                              </button>
                              <button
                                onClick={handleAcceptAllStrong}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                              >
                                Accept all strong (≥70%)
                              </button>
                            </div>
                            {selectedLinkKeys.size > 0 && (
                              <button
                                onClick={handleApplySelectedLinks}
                                className="text-[10px] px-2.5 py-1 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium flex items-center gap-1"
                              >
                                <Check className="w-2.5 h-2.5" />
                                Apply selected ({selectedLinkKeys.size})
                              </button>
                            )}
                          </div>

                          {/* Strong suggestions with load-more */}
                          <div className="space-y-2">
                            {strongPage.map((s) => (
                              <SuggestionRow key={pairKey(s)} s={s} />
                            ))}
                          </div>

                          {/* Load more button */}
                          {hasMore && (
                            <button
                              onClick={() => setLinkPage((p) => p + 1)}
                              className="w-full text-xs py-2 border border-border rounded-lg text-ink2 hover:bg-hover hover:text-ink transition-colors font-medium"
                            >
                              Load more ({strongSuggestions.length - strongPage.length} remaining)
                            </button>
                          )}

                          {/* Weaker suggestions collapsible */}
                          {weakerSuggestions.length > 0 && (
                            <div className="border border-border rounded-xl overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setWeakerExpanded((v) => !v)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-ink3 hover:bg-hover transition-colors"
                              >
                                <span>Weaker suggestions ({weakerSuggestions.length}) — score &lt; 40%</span>
                                {weakerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              {weakerExpanded && (
                                <div className="border-t border-border p-2 space-y-2 bg-surface2">
                                  {weakerSuggestions.map((s) => (
                                    <SuggestionRow key={pairKey(s)} s={s} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

          </div>{/* end dimmed wrapper */}

          {/* ── EXPORT — always full opacity, no AI key required ── */}
          {mode === 'export' && (
            <div className="space-y-5">
              <p className="text-xs text-ink2">Download your entries as a file. No AI key required.</p>

              {/* Format */}
              <div>
                <p className="text-xs font-medium text-ink mb-2">Format</p>
                <div className="flex gap-2">
                  {([['md', 'Markdown (.md)', FileText], ['csv', 'Spreadsheet (.csv)', Download]] as const).map(([val, label, Icon]) => (
                    <button
                      key={val}
                      onClick={() => setExportFormat(val)}
                      className={cn(
                        'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        exportFormat === val
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-border text-ink2 hover:border-border2 hover:text-ink'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope */}
              <div>
                <p className="text-xs font-medium text-ink mb-2">Scope</p>
                <div className="flex gap-2">
                  {([['all', `All entries (${rows.length})`], ['filtered', `Current view (${filteredRows.length})`]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setExportScope(val)}
                      className={cn(
                        'flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        exportScope === val
                          ? 'border-brand bg-brand/5 text-brand'
                          : 'border-border text-ink2 hover:border-border2 hover:text-ink'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-surface2 rounded-xl p-4 text-xs text-ink2 space-y-1">
                <p className="font-medium text-ink text-sm">Export preview</p>
                <p>• Format: <span className="text-ink font-medium">{exportFormat === 'md' ? 'Markdown' : 'CSV'}</span></p>
                <p>• Entries: <span className="text-ink font-medium">{exportScope === 'all' ? rows.length : filteredRows.length}</span></p>
                <p>• Fields: title, category, tags, content, actions, due date, status, media URL</p>
                {exportFormat === 'md' && <p className="text-ink3">Markdown preserves rich structure with headings and bullet points.</p>}
                {exportFormat === 'csv' && <p className="text-ink3">CSV is compatible with Excel, Google Sheets, Notion, etc.</p>}
              </div>

              <Button variant="primary" size="sm" onClick={handleExport} className="w-full justify-center">
                <Download className="w-3.5 h-3.5" />
                Download {exportFormat.toUpperCase()} file
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
