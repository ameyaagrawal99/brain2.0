import { useEffect, useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { MarkdownToolbar } from '@/components/ui/MarkdownToolbar'
import { InstructionsBox } from '@/components/ui/InstructionsBox'
import { WikiLinkedText, WikiTextarea } from '@/components/ui/WikiLinkedText'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { parseTags, formatDate, formatRelative, isImageUrl } from '@/lib/utils'
import { expandChain } from '@/lib/linkGraph'
import { parsePeople } from '@/lib/contacts'
import { renderMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { EditableFields } from '@/types/sheet'
import {
  Edit2, Save, X, Trash2, Tag, Wand2, CheckSquare,
  ExternalLink, Calendar, Hash, Image, Undo2, Redo2, Copy, Heading,
  Users, UserPlus, Link2, Network, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { BrainRow } from '@/types/sheet'

function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

function cleanVal(v: string): string {
  return isFormula(v) ? '' : (v || '')
}

const DEFAULT_CATEGORIES = ['', 'Journal', 'Work', 'Learning', 'Health', 'Finance', 'Ideas', 'Personal', 'Other']
const STATUS_OPTIONS      = ['', 'Pending', 'In Progress', 'In Review', 'Done', 'Blocked']

interface RelatedEntry {
  row: BrainRow
  reason: string
  score?: number
  alreadyLinked?: boolean
  isBacklink?: boolean
}

type ConnectionTab = 'backlinks' | 'outgoing' | 'suggested'

export function DetailModal() {
  const selectedRow          = useBrainStore((s) => s.selectedRow)
  const openModal            = useBrainStore((s) => s.openModal)
  const closeModal           = useBrainStore((s) => s.closeModal)
  const settings             = useBrainStore((s) => s.settings)
  const customCats           = useBrainStore((s) => s.customCategories)
  const entryHistory         = useBrainStore((s) => s.entryHistory)
  const entryFuture          = useBrainStore((s) => s.entryFuture)
  const aiInstructions       = useBrainStore((s) => s.aiInstructions)
  const updateAiInstructions = useBrainStore((s) => s.updateAiInstructions)
  const allRows              = useBrainStore((s) => s.rows)
  const contacts             = useBrainStore((s) => s.contacts)

  const { saveRow, removeRow, undoRow, redoRow } = useSheetSync()
  const { run: runAI, loading: aiLoading, error: aiError }       = useAI()
  const { run: runRelated, loading: relatedLoading }             = useAI()

  const [editing, setEditing]       = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAI, setShowAI]         = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [fields, setFields]         = useState<Partial<EditableFields>>({})
  const [relatedEntries, setRelatedEntries] = useState<RelatedEntry[]>([])
  const [showRelated, setShowRelated]       = useState(false)
  const [selectedRelated, setSelectedRelated] = useState<Set<number>>(new Set())
  const [activeConnTab, setActiveConnTab]     = useState<ConnectionTab>('suggested')
  const [relateQuery, setRelateQuery]         = useState('')
  const [relateFilter, setRelateFilter]       = useState<'all' | 'unlinked' | 'linked'>('all')

  const row        = selectedRow
  const histSteps  = row ? (entryHistory[row._rowIndex]?.length  ?? 0) : 0
  const futSteps   = row ? (entryFuture[row._rowIndex]?.length   ?? 0) : 0

  // All names already used across entries (for people autocomplete)
  // ⚠️ Must be BEFORE any conditional return to satisfy Rules of Hooks
  const allPeopleNames = useMemo(() => {
    const set = new Set<string>()
    allRows.forEach((r) => parsePeople(r.people ?? '').forEach((n) => set.add(n)))
    contacts.forEach((c) => set.add(c.name))
    return [...set].sort()
  }, [allRows, contacts])

  // Backlinks: other entries that reference this one via [[Title]] in any text field
  // ⚠️ Must be BEFORE any conditional return to satisfy Rules of Hooks
  const backlinks = useMemo(() => {
    if (!selectedRow?.title?.trim()) return []
    const escaped = selectedRow.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\[\\[\\s*${escaped}\\s*\\]\\]`, 'i')
    return allRows.filter((r) => {
      if (r._rowIndex === selectedRow._rowIndex) return false
      return pattern.test([r.original, r.rewritten, r.actionItems, r.links].join('\n'))
    })
  }, [allRows, selectedRow])

  // Reset multi-select when AI suggestions change
  useEffect(() => {
    setSelectedRelated(new Set())
  }, [relatedEntries])

  // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z only when modal is open
  useEffect(() => {
    if (!row) return
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod   = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoRow(row._rowIndex)
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redoRow(row._rowIndex)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [row, undoRow, redoRow])

  if (!selectedRow) return null
  const merged   = { ...selectedRow, ...fields }
  const tags     = parseTags(cleanVal(merged.tags))

  const original    = cleanVal(merged.original)
  const rewritten   = cleanVal(merged.rewritten)
  const actionItems = cleanVal(merged.actionItems)
  const links       = cleanVal(merged.links)
  const mediaUrl    = cleanVal(merged.mediaUrl)

  // Separate HTTP links from [[entry refs]] in the links field
  const linkLines  = links.split('\n').map((l) => l.trim()).filter(Boolean)
  const httpLinks  = linkLines.filter((l) => l.startsWith('http'))
  const entryRefs  = linkLines
    .filter((l) => /^\[\[.+\]\]$/.test(l))
    .map((l) => l.slice(2, -2).trim())

  const CATEGORY_OPTIONS = ['', ...new Set([
    ...DEFAULT_CATEGORIES.slice(1),
    ...customCats,
  ])].sort((a, b) => a === '' ? -1 : b === '' ? 1 : a.localeCompare(b))

  const hasImage   = mediaUrl && isImageUrl(mediaUrl)
  const peopleTags = parsePeople(cleanVal(merged.people ?? ''))

  const inputCls = 'w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/40'

  function patchField(key: keyof EditableFields, val: string) {
    setFields((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    if (!row) return
    await saveRow(row._rowIndex, fields, 'Edit')
    setEditing(false)
    setFields({})
  }

  function handleCancel() {
    setEditing(false)
    setFields({})
  }

  async function handleDelete() {
    if (!row) return
    closeModal()
    await removeRow(row._rowIndex)
  }

  async function runAIAction(action: 'rewrite' | 'tags' | 'actions' | 'title' | 'all') {
    const text = original || rewritten || merged.title
    if (!text) { toast.error('No text to process'); return }
    const result = await runAI(action, text, {
      systemInstruction: aiInstructions.quick || undefined,
    })
    if (result.title)       patchField('title',        result.title)
    if (result.rewritten)   patchField('rewritten',    result.rewritten)
    if (result.tags)        patchField('tags',         result.tags)
    if (result.category)    patchField('category',     result.category)
    if (result.actionItems) patchField('actionItems',  result.actionItems)
    if (Object.keys(result).length) {
      setEditing(true)
      toast.success('AI applied — review and save')
    }
  }

  async function handleFindRelated() {
    if (!row) return
    const thisContent = original || rewritten || merged.title
    if (!thisContent.trim()) { toast.error('No content to find related entries for'); return }

    setRelatedEntries([])
    setShowRelated(true)
    setActiveConnTab('suggested')

    // Build set of already-linked entry titles for deduplication
    const currentLinksText = (fields.links ?? selectedRow?.links ?? '')
    const existingLinkTitles = new Set(
      currentLinksText.split('\n')
        .filter((l) => /^\[\[.+\]\]$/.test(l.trim()))
        .map((l) => l.trim().slice(2, -2).toLowerCase())
    )

    // Keyword-score the other rows for better context selection
    const words = thisContent.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const scored = allRows
      .filter((r) => r._rowIndex !== row._rowIndex)
      .map((r) => {
        const text = [r.title, r.category, r.tags, r.rewritten, r.original].join(' ').toLowerCase()
        const kw = words.reduce((s, w) => s + (text.split(w).length - 1), 0)
        return { r, kw }
      })
      .sort((a, b) => b.kw - a.kw)

    // Top 35 most keyword-relevant as AI context
    const pool = scored.slice(0, 35).map(({ r }) => r)
    const context = pool.map((r, i) =>
      `${i + 1}. Title: "${r.title}" | Category: ${r.category || 'general'} | Snippet: ${(r.rewritten || r.original || '').slice(0, 120)}`
    ).join('\n')

    const focusClause = relateQuery.trim()
      ? `\nSearch focus: "${relateQuery.trim()}" — prioritize entries related to this focus even if they seem unrelated on the surface.`
      : ''
    const prompt = `Current entry: "${merged.title}"\nContent: ${thisContent.slice(0, 300)}${focusClause}\n\nKnowledge base (${pool.length} entries):\n${context}\n\nFind the 10 most semantically related entries. Return ONLY valid JSON array:\n[{"title":"exact entry title","reason":"brief 1-sentence why related","score":0-100}]\nWhere score is 0-100 relevance (70+ = strong, 40-69 = moderate, <40 = weak). JSON only, no other text.`

    try {
      const result = await runRelated('rewrite', prompt, {
        maxTokens: 600,
        systemInstruction: aiInstructions.relate || undefined,
      })
      const json = (result.rewritten || '').trim()
      const match = json.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0]) as { title: string; reason: string; score?: number }[]
        const enriched = parsed.flatMap((item) => {
          const found = allRows.find((r) =>
            r.title?.toLowerCase().trim() === item.title.toLowerCase().trim()
          )
          if (!found) return []
          const titleKey = found.title?.toLowerCase().trim() ?? ''
          return [{
            row: found,
            reason: item.reason || '',
            score: typeof item.score === 'number' ? item.score : undefined,
            alreadyLinked: existingLinkTitles.has(titleKey),
            isBacklink: backlinks.some((b) => b._rowIndex === found._rowIndex),
          }]
        })
        setRelatedEntries(enriched)
        if (!enriched.length) toast('No closely related entries found')
      } else {
        toast.error('Could not parse AI response')
      }
    } catch {
      toast.error('Failed to find related entries')
    }
  }

  function linkToEntry(r: BrainRow) {
    const currentLinks = (fields.links ?? selectedRow?.links ?? '').trim()
    const newRef = `[[${r.title}]]`
    if (currentLinks.includes(newRef)) { toast('Already linked'); return }
    patchField('links', [currentLinks, newRef].filter(Boolean).join('\n'))
    setEditing(true)
    toast.success('Linked — click Save to keep')
  }

  function handleLinkSelected() {
    const toLink = relatedEntries
      .filter(({ row: r }) => selectedRelated.has(r._rowIndex))
      .map(({ row: r }) => r)
    const currentLinks = (fields.links ?? selectedRow?.links ?? '').trim()
    const newRefs = toLink
      .map((r) => `[[${r.title}]]`)
      .filter((ref) => !currentLinks.includes(ref))
    if (!newRefs.length) { toast('All selected entries already linked'); return }
    patchField('links', [currentLinks, ...newRefs].filter(Boolean).join('\n'))
    setEditing(true)
    setSelectedRelated(new Set())
    toast.success(`${newRefs.length} entr${newRefs.length === 1 ? 'y' : 'ies'} linked — click Save to keep`)
  }

  function handleLinkChain(r: BrainRow) {
    const chain = expandChain([r], allRows, 3)
    const currentLinks = (fields.links ?? selectedRow?.links ?? '').trim()
    const newRefs = [r, ...chain]
      .map((c) => `[[${c.title}]]`)
      .filter((ref) => !currentLinks.includes(ref))
    if (!newRefs.length) { toast('Entire chain already linked'); return }
    patchField('links', [currentLinks, ...newRefs].filter(Boolean).join('\n'))
    setEditing(true)
    toast.success(
      chain.length > 0
        ? `Linked ${newRefs.length} entr${newRefs.length === 1 ? 'y' : 'ies'} (entry + ${chain.length} chained) — click Save to keep`
        : 'Linked — click Save to keep'
    )
  }

  function unlinkEntry(title: string) {
    const currentLinks = (fields.links ?? selectedRow?.links ?? '').trim()
    const newLinks = currentLinks
      .split('\n')
      .filter((l) => l.trim() !== `[[${title}]]`)
      .join('\n')
    patchField('links', newLinks)
    setEditing(true)
    toast.success('Unlinked — click Save to keep')
  }

  const actionLines = actionItems
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0)

  const showRelatedSection = backlinks.length > 0 || entryRefs.length > 0 || relatedEntries.length > 0 || relatedLoading

  return (
    <>
      <Modal open={!!selectedRow} onClose={closeModal} size="xl">
        <div className="flex flex-col h-full overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0 pr-2">
              {editing ? (
                <input
                  value={merged.title}
                  onChange={(e) => patchField('title' as keyof EditableFields, e.target.value)}
                  className="w-full text-base font-semibold text-ink bg-transparent border-b-2 border-brand focus:outline-none pb-0.5"
                  placeholder="Title"
                  autoFocus
                />
              ) : (
                <h2 className="text-base font-semibold text-ink leading-snug">{merged.title || 'Untitled'}</h2>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {merged.category && !isFormula(merged.category) && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-brand/8 text-brand">
                    {merged.category}
                  </span>
                )}
                {merged.subCategory && !isFormula(merged.subCategory) && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface2 text-ink2">
                    {merged.subCategory}
                  </span>
                )}
                {merged.taskStatus && !isFormula(merged.taskStatus) && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface2 text-ink2">
                    {merged.taskStatus}
                  </span>
                )}
                {merged.srNo && (
                  <span className="flex items-center gap-0.5 text-[11px] text-ink3">
                    <Hash className="w-3 h-3" />{merged.srNo}
                  </span>
                )}
                {/* Backlinks badge */}
                {backlinks.length > 0 && (
                  <button
                    onClick={() => setShowRelated((v) => !v)}
                    className="flex items-center gap-0.5 text-[11px] text-brand hover:underline"
                  >
                    <Link2 className="w-3 h-3" />
                    {backlinks.length} backlink{backlinks.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Undo / Redo */}
              <button
                onClick={() => undoRow(selectedRow._rowIndex)}
                disabled={histSteps === 0}
                title={histSteps > 0 ? `Undo (${histSteps} step${histSteps > 1 ? 's' : ''}) — ⌘Z` : 'Nothing to undo'}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                  histSteps > 0
                    ? 'text-ink2 hover:bg-hover hover:text-ink'
                    : 'text-ink3 opacity-40 cursor-not-allowed',
                )}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => redoRow(selectedRow._rowIndex)}
                disabled={futSteps === 0}
                title={futSteps > 0 ? `Redo (${futSteps} step${futSteps > 1 ? 's' : ''}) — ⌘⇧Z` : 'Nothing to redo'}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                  futSteps > 0
                    ? 'text-ink2 hover:bg-hover hover:text-ink'
                    : 'text-ink3 opacity-40 cursor-not-allowed',
                )}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-border mx-0.5" />

              <Button size="sm" variant="ghost" onClick={() => setShowAI(!showAI)}
                className={cn(showAI && 'text-brand bg-brand/8')}>
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">AI</span>
              </Button>
              {editing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={handleCancel}><X className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="primary" onClick={handleSave}><Save className="w-3.5 h-3.5" />Save</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">Edit</span>
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => setShowDelete(!showDelete)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* ── AI bar ── */}
          {showAI && (
            <div className="px-5 py-3 bg-brand/5 border-b border-brand/10 space-y-2.5 shrink-0">
              {settings.openAiKey ? (
                <>
                  <InstructionsBox
                    value={aiInstructions.quick}
                    onChange={(v) => updateAiInstructions({ quick: v })}
                    placeholder="e.g. Be concise. Use bullet points. Focus on action items."
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-brand">AI:</span>
                    {([
                      { a: 'title'   as const, l: 'Title',     icon: Heading },
                      { a: 'rewrite' as const, l: 'Rewrite',   icon: Wand2 },
                      { a: 'tags'    as const, l: 'Tags',       icon: Tag },
                      { a: 'actions' as const, l: 'Actions',    icon: CheckSquare },
                      { a: 'all'     as const, l: 'Enhance all', icon: Wand2 },
                    ] as const).map(({ a, l, icon: Icon }) => (
                      <Button key={a} size="sm" variant="outline" onClick={() => runAIAction(a)} loading={aiLoading && !relatedLoading}>
                        <Icon className="w-3 h-3" />{l}
                      </Button>
                    ))}
                    <div className="w-px h-4 bg-border/60" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFindRelated}
                      loading={relatedLoading}
                      className="border-brand/30 text-brand hover:bg-brand/5"
                    >
                      <Network className="w-3 h-3" />
                      Find related
                    </Button>
                    {aiError && <span className="text-xs text-red-500 ml-1">{aiError}</span>}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-ink3 px-0.5">For "Find related":</p>
                    <input
                      type="text"
                      value={relateQuery}
                      onChange={(e) => setRelateQuery(e.target.value)}
                      placeholder="Search focus — e.g. machine learning, meetings with Sarah…"
                      className="w-full text-xs px-2.5 py-1.5 bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                    <InstructionsBox
                      value={aiInstructions.relate}
                      onChange={(v) => updateAiInstructions({ relate: v })}
                      placeholder="e.g. focus on technical connections, only health topics, ignore personal entries"
                    />
                  </div>
                </>
              ) : (
                <span className="text-xs text-ink3">Add OpenAI key in Settings to enable AI features.</span>
              )}
            </div>
          )}

          {/* ── Delete confirm ── */}
          {showDelete && (
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-sm text-ink">Delete this entry? Cannot be undone.</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
                <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          )}

          {/* ── Scrollable content ── */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Media */}
            {(mediaUrl || editing) && (
              <Section title="Media" icon={<Image className="w-3.5 h-3.5" />}>
                {editing ? (
                  <input
                    type="url"
                    value={merged.mediaUrl || ''}
                    onChange={(e) => patchField('mediaUrl', e.target.value)}
                    className={inputCls}
                    placeholder="https://example.com/image.jpg"
                  />
                ) : hasImage ? (
                  <button
                    className="block w-full rounded-xl overflow-hidden border border-border hover:opacity-95 transition-opacity"
                    onClick={() => setShowLightbox(true)}
                  >
                    <img
                      src={mediaUrl}
                      alt={merged.title}
                      className="w-full max-h-64 object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).closest('button')!.style.display = 'none' }}
                    />
                    <p className="text-xs text-ink3 text-center py-1.5">Click to enlarge</p>
                  </button>
                ) : mediaUrl ? (
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-brand hover:underline break-all flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />{mediaUrl}
                  </a>
                ) : null}
              </Section>
            )}

            {/* Original note — rich text */}
            <Section
              title="Original note"
              wordCount={original ? original.trim().split(/\s+/).filter(Boolean).length : 0}
            >
              {editing ? (
                <MarkdownToolbar
                  value={merged.original || ''}
                  onChange={(v) => patchField('original', v)}
                  rows={5}
                  placeholder="Your original note... (supports **bold**, *italic*, - lists)"
                />
              ) : original ? (
                <div
                  className="md-body prose-journal text-sm text-ink"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(original) }}
                />
              ) : (
                <p className="text-sm text-ink3 italic">No content</p>
              )}
            </Section>

            {/* Rewritten — rich text */}
            <Section
              title="Rewritten"
              badge="AI"
              wordCount={rewritten ? rewritten.trim().split(/\s+/).filter(Boolean).length : 0}
              onCopy={rewritten ? () => {
                navigator.clipboard.writeText(rewritten)
                toast.success('Copied to clipboard')
              } : undefined}
            >
              {editing ? (
                <MarkdownToolbar
                  value={merged.rewritten || ''}
                  onChange={(v) => patchField('rewritten', v)}
                  rows={5}
                  placeholder="AI-polished version... (supports **bold**, *italic*, - lists)"
                />
              ) : rewritten ? (
                <div
                  className="md-body prose-journal text-sm text-ink"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(rewritten) }}
                />
              ) : (
                <p className="text-sm text-ink3 italic">
                  {settings.openAiKey ? 'Click AI → Rewrite to generate' : 'Add OpenAI key in Settings to enable AI'}
                </p>
              )}
            </Section>

            {/* Action items */}
            {(actionLines.length > 0 || editing) && (
              <Section title="Action items" icon={<CheckSquare className="w-3.5 h-3.5" />}>
                {editing ? (
                  <Textarea value={merged.actionItems} onChange={(v) => patchField('actionItems', v)} rows={4} placeholder={"1. First action\n2. Second action"} />
                ) : (
                  <ul className="space-y-2">
                    {actionLines.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
                        <span className="w-5 h-5 rounded-md bg-brand/10 text-brand text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <MetaField label="Category"     editing={editing} value={cleanVal(merged.category)}    onChange={(v) => patchField('category', v)}    type="select" options={CATEGORY_OPTIONS} />
              <MetaField label="Sub-category" editing={editing} value={cleanVal(merged.subCategory)} onChange={(v) => patchField('subCategory', v)} />
              <MetaField label="Status"       editing={editing} value={cleanVal(merged.taskStatus)}  onChange={(v) => patchField('taskStatus', v)}  type="select" options={STATUS_OPTIONS} />
              <MetaField label="Due date"     editing={editing} value={cleanVal(merged.dueDate)}     onChange={(v) => patchField('dueDate', v)}     type="date" />

              {/* Links: HTTP + entry refs */}
              {(links || editing) && (
                <div className="sm:col-span-2">
                  {editing ? (
                    <div>
                      <SectionLabel>Links</SectionLabel>
                      <div className="mt-1.5">
                        <WikiTextarea
                          value={links}
                          onChange={(v) => patchField('links', v)}
                          rows={3}
                          placeholder={"https://example.com\n[[Other Entry Title]]"}
                          allRows={allRows}
                        />
                        <p className="text-[10px] text-ink3 mt-1">
                          One per line — HTTP URLs or <code>[[Entry Title]]</code> to link entries
                        </p>
                      </div>
                    </div>
                  ) : (httpLinks.length > 0 || entryRefs.length > 0) ? (
                    <div>
                      <SectionLabel icon={<Link2 className="w-3.5 h-3.5" />}>Links</SectionLabel>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {httpLinks.map((l, i) => (
                          <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-surface2 border border-border rounded-lg px-2.5 py-1 text-brand hover:bg-brand/5 hover:border-brand/30 transition-colors">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{l.length > 45 ? l.slice(0, 45) + '…' : l}</span>
                          </a>
                        ))}
                        {entryRefs.map((title, i) => {
                          const found = allRows.find((r) => r.title?.toLowerCase().trim() === title.toLowerCase().trim())
                          return found ? (
                            <button
                              key={i}
                              onClick={() => openModal(found)}
                              className="flex items-center gap-1.5 text-xs bg-brand/5 border border-brand/20 rounded-lg px-2.5 py-1 text-brand hover:bg-brand/10 transition-colors font-medium"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              {title}
                            </button>
                          ) : (
                            <span key={i} className="text-xs text-red-400 line-through flex items-center gap-1">
                              <Link2 className="w-3 h-3" />{title}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <SectionLabel icon={<Tag className="w-3.5 h-3.5" />}>Tags</SectionLabel>
              <div className="mt-2">
                {editing ? (
                  <input
                    value={merged.tags}
                    onChange={(e) => patchField('tags', e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    placeholder="tag1, tag2, tag3"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length > 0
                      ? tags.map((t) => <span key={t} className="tag-chip">#{t}</span>)
                      : <span className="text-xs text-ink3 italic">No tags</span>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* People */}
            <div>
              <SectionLabel icon={<Users className="w-3.5 h-3.5" />}>People</SectionLabel>
              <div className="mt-2">
                {editing ? (
                  <PeopleInput
                    value={merged.people ?? ''}
                    onChange={(v) => patchField('people', v)}
                    suggestions={allPeopleNames}
                  />
                ) : peopleTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {peopleTags.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 text-xs bg-brand/10 text-brand border border-brand/20 rounded-full px-2.5 py-0.5 font-medium"
                      >
                        <span className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center text-[9px] font-bold">
                          {name[0]?.toUpperCase()}
                        </span>
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink3 italic flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    {editing ? 'Add people' : 'No contacts linked'}
                  </p>
                )}
              </div>
            </div>

            {/* ── Connections Panel ── */}
            {(showRelatedSection || showRelated) && (
              <div className="border border-border rounded-xl overflow-hidden">
                {/* Header (collapsible) */}
                <button
                  onClick={() => setShowRelated((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface2/50 hover:bg-hover transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Network className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[11px] font-semibold text-ink2 uppercase tracking-wider">
                      Connections
                    </span>
                    <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold">
                      {backlinks.length + entryRefs.length + relatedEntries.length}
                    </span>
                  </div>
                  {showRelated ? <ChevronUp className="w-3.5 h-3.5 text-ink3" /> : <ChevronDown className="w-3.5 h-3.5 text-ink3" />}
                </button>

                {showRelated && (
                  <>
                    {/* Tab bar */}
                    <div className="flex border-b border-border bg-surface2/30">
                      {([
                        { key: 'backlinks' as ConnectionTab, label: `Backlinks`, count: backlinks.length },
                        { key: 'outgoing'  as ConnectionTab, label: `Outgoing`,  count: entryRefs.length },
                        { key: 'suggested' as ConnectionTab, label: `AI Suggested`, count: relatedEntries.length },
                      ]).map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => setActiveConnTab(key)}
                          className={cn(
                            'flex-1 text-[10px] font-semibold py-2 px-1.5 transition-colors uppercase tracking-wider flex items-center justify-center gap-1',
                            activeConnTab === key
                              ? 'text-brand border-b-2 border-brand bg-brand/5'
                              : 'text-ink3 hover:text-ink2 border-b-2 border-transparent',
                          )}
                        >
                          {label}
                          {count > 0 && (
                            <span className={cn(
                              'text-[9px] px-1 py-0.5 rounded-full font-bold',
                              activeConnTab === key ? 'bg-brand text-white' : 'bg-border text-ink3',
                            )}>
                              {count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div className="px-4 py-3">

                      {/* ── BACKLINKS TAB ── */}
                      {activeConnTab === 'backlinks' && (
                        backlinks.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {backlinks.map((r) => (
                              <button
                                key={r._rowIndex}
                                onClick={() => openModal(r)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface2 border border-border rounded-lg text-xs hover:border-brand/30 hover:bg-brand/5 transition-colors"
                              >
                                <Link2 className="w-3 h-3 text-brand shrink-0" />
                                <span className="text-ink font-medium truncate max-w-[160px]">{r.title}</span>
                                {r.category && <span className="text-ink3 shrink-0">{r.category}</span>}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-ink3 italic py-2">No entries link to this one yet.</p>
                        )
                      )}

                      {/* ── OUTGOING TAB ── */}
                      {activeConnTab === 'outgoing' && (
                        entryRefs.length > 0 ? (
                          <div className="space-y-2">
                            {entryRefs.map((title, i) => {
                              const found = allRows.find((r) => r.title?.toLowerCase().trim() === title.toLowerCase().trim())
                              return found ? (
                                <div key={i} className="flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-lg">
                                  <div className="flex-1 min-w-0">
                                    <button
                                      onClick={() => openModal(found)}
                                      className="text-sm font-medium text-brand hover:underline text-left truncate block max-w-full"
                                    >
                                      {title}
                                    </button>
                                    {found.category && (
                                      <span className="text-[10px] text-ink3">{found.category}</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      onClick={() => openModal(found)}
                                      className="text-[10px] px-2 py-1 bg-brand/5 text-brand border border-brand/20 rounded-lg hover:bg-brand/10 transition-colors font-medium"
                                    >
                                      Open
                                    </button>
                                    <button
                                      onClick={() => unlinkEntry(title)}
                                      className="text-[10px] px-2 py-1 bg-surface text-ink2 border border-border rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors font-medium"
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div key={i} className="flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-lg">
                                  <span className="text-xs text-red-400 line-through flex items-center gap-1 flex-1">
                                    <Link2 className="w-3 h-3" />{title}
                                  </span>
                                  <span className="text-[10px] text-ink3 shrink-0">not found</span>
                                  <button
                                    onClick={() => unlinkEntry(title)}
                                    className="text-[10px] px-2 py-1 bg-surface text-red-400 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium shrink-0"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-ink3 italic py-2">
                            No outgoing links yet. Add <code className="text-brand">{'[[Entry Title]]'}</code> in the Links field to connect entries.
                          </p>
                        )
                      )}

                      {/* ── AI SUGGESTED TAB ── */}
                      {activeConnTab === 'suggested' && (
                        <div className="space-y-3">
                          {relatedLoading && (
                            <div className="flex items-center gap-2 text-xs text-ink3 py-2">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              Finding related entries…
                            </div>
                          )}

                          {!relatedLoading && relatedEntries.length === 0 && (
                            <p className="text-xs text-ink3 italic py-2">
                              Click "Find related" in the AI bar to discover AI-suggested connections.
                            </p>
                          )}

                          {/* Multi-select toolbar */}
                          {selectedRelated.size > 0 && (
                            <div className="flex items-center gap-2 bg-brand/5 border border-brand/20 rounded-lg px-3 py-2">
                              <span className="text-xs text-brand font-medium">{selectedRelated.size} selected</span>
                              <button
                                onClick={handleLinkSelected}
                                className="text-[10px] px-2 py-1 bg-brand text-white rounded-md hover:bg-brand/80 transition-colors font-medium flex items-center gap-1"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                                Link all
                              </button>
                              <button
                                onClick={() => setSelectedRelated(new Set())}
                                className="text-[10px] px-2 py-1 text-ink3 hover:text-ink transition-colors font-medium ml-auto"
                              >
                                Clear
                              </button>
                            </div>
                          )}

                          {/* Filter bar */}
                          {relatedEntries.length > 0 && (
                            <div className="flex items-center gap-1">
                              {(['all', 'unlinked', 'linked'] as const).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setRelateFilter(f)}
                                  className={cn(
                                    'text-[10px] px-2 py-1 rounded-lg font-medium capitalize transition-colors',
                                    relateFilter === f ? 'bg-brand text-white' : 'bg-surface2 text-ink2 hover:bg-hover',
                                  )}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Tiered groups */}
                          {relatedEntries.length > 0 && (() => {
                            const visible = relatedEntries.filter((e) => {
                              if (relateFilter === 'linked')   return !!e.alreadyLinked
                              if (relateFilter === 'unlinked') return !e.alreadyLinked
                              return true
                            })
                            const strong   = visible.filter((e) => (e.score ?? 50) >= 70)
                            const moderate = visible.filter((e) => { const s = e.score ?? 50; return s >= 40 && s < 70 })
                            const weak     = visible.filter((e) => (e.score ?? 50) < 40)
                            const tiers = [
                              { label: 'Strong match',   entries: strong,   cls: 'text-green-600 dark:text-green-400' },
                              { label: 'Moderate match', entries: moderate, cls: 'text-amber-600 dark:text-amber-400' },
                              { label: 'Weak match',     entries: weak,     cls: 'text-ink3' },
                            ].filter(({ entries }) => entries.length > 0)

                            if (!visible.length) return (
                              <p className="text-xs text-ink3 italic py-1">
                                No {relateFilter === 'linked' ? 'linked' : 'unlinked'} entries in results.
                              </p>
                            )

                            return (
                              <div className="space-y-3">
                                {tiers.map(({ label, entries, cls }) => (
                                  <div key={label}>
                                    <p className={cn('text-[10px] font-semibold uppercase tracking-wider mb-1.5', cls)}>
                                      {label} ({entries.length})
                                    </p>
                                    <div className="space-y-2">
                                      {entries.map(({ row: r, reason, alreadyLinked, isBacklink }) => (
                                        <div
                                          key={r._rowIndex}
                                          className={cn(
                                            'flex items-center gap-2 p-2.5 bg-surface2 border border-border rounded-lg transition-opacity',
                                            alreadyLinked && 'opacity-60',
                                          )}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedRelated.has(r._rowIndex)}
                                            disabled={!!alreadyLinked}
                                            onChange={() => setSelectedRelated((prev) => {
                                              const next = new Set(prev)
                                              next.has(r._rowIndex) ? next.delete(r._rowIndex) : next.add(r._rowIndex)
                                              return next
                                            })}
                                            className="w-3.5 h-3.5 rounded border-border accent-brand shrink-0 cursor-pointer disabled:cursor-not-allowed"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <button
                                                onClick={() => openModal(r)}
                                                className="text-sm font-medium text-brand hover:underline text-left truncate max-w-[160px]"
                                              >
                                                {r.title}
                                              </button>
                                              {alreadyLinked && (
                                                <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                                  Linked
                                                </span>
                                              )}
                                              {isBacklink && !alreadyLinked && (
                                                <span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                                  Backlink
                                                </span>
                                              )}
                                            </div>
                                            {reason && (
                                              <p className="text-[11px] text-ink3 mt-0.5 line-clamp-1">{reason}</p>
                                            )}
                                          </div>
                                          {!alreadyLinked && (
                                            <div className="flex gap-1 shrink-0">
                                              <button
                                                onClick={() => openModal(r)}
                                                className="text-[10px] px-2 py-1 bg-brand/5 text-brand border border-brand/20 rounded-lg hover:bg-brand/10 transition-colors font-medium"
                                              >
                                                Open
                                              </button>
                                              <button
                                                onClick={() => linkToEntry(r)}
                                                className="text-[10px] px-2 py-1 bg-surface text-ink2 border border-border rounded-lg hover:bg-hover transition-colors font-medium flex items-center gap-1"
                                              >
                                                <Link2 className="w-2.5 h-2.5" />
                                                Link
                                              </button>
                                              <button
                                                onClick={() => handleLinkChain(r)}
                                                title={`Link entry + all its connected entries (up to 3 hops)`}
                                                className="text-[10px] px-2 py-1 bg-surface text-ink2 border border-border rounded-lg hover:bg-hover transition-colors font-medium flex items-center gap-1"
                                              >
                                                <Network className="w-2.5 h-2.5" />
                                                Chain
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>
            )}

            {/* Footer timestamps */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink3 pt-2 border-t border-border">
              {merged.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Created {formatDate(merged.createdAt)}</span>}
              {merged.updatedAt && !isFormula(merged.updatedAt) && <span>Updated {formatRelative(merged.updatedAt)}</span>}
              {merged.messageId && !isFormula(merged.messageId) && <span>ID: {merged.messageId}</span>}
              {histSteps > 0 && (
                <span className="text-brand/70">{histSteps} unsaved undo step{histSteps > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {showLightbox && hasImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <img
            src={mediaUrl}
            alt={merged.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  )
}

/* ── PeopleInput ─────────────────────────────────────────────────────────── */

function PeopleInput({
  value,
  onChange,
  suggestions,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
}) {
  const [inputVal, setInputVal] = useState('')
  const [open, setOpen]         = useState(false)
  const people = value.split(',').map((s) => s.trim()).filter(Boolean)

  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()) && !people.includes(s))
    .slice(0, 8)

  function add(name: string) {
    const trimmed = name.trim()
    if (!trimmed || people.includes(trimmed)) return
    onChange([...people, trimmed].join(', '))
    setInputVal('')
    setOpen(false)
  }

  function remove(name: string) {
    onChange(people.filter((p) => p !== name).join(', '))
  }

  return (
    <div className="space-y-2">
      {/* Current people pills */}
      {people.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {people.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs bg-brand/10 text-brand border border-brand/20 rounded-full pl-2 pr-1 py-0.5 font-medium"
            >
              <span className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center text-[9px] font-bold shrink-0">
                {name[0]?.toUpperCase()}
              </span>
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-brand/20 transition-colors ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Input */}
      <div className="relative">
        <input
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputVal.trim()) { e.preventDefault(); add(inputVal) }
            if (e.key === 'Escape') { setOpen(false); setInputVal('') }
          }}
          placeholder="Type a name and press Enter…"
          className="w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 placeholder:text-ink3"
        />
        {open && filtered.length > 0 && (
          <div className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-hover flex items-center gap-2 text-ink"
              >
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold shrink-0">
                  {s[0]?.toUpperCase()}
                </span>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-ink3">{icon}</span>}
      <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{children}</span>
    </div>
  )
}

function Section({ title, badge, icon, wordCount, onCopy, children }: {
  title: string; badge?: string; icon?: React.ReactNode
  wordCount?: number; onCopy?: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <span className="text-ink3">{icon}</span>}
        <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{title}</span>
        {badge && (
          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>
        )}
        {wordCount != null && wordCount > 0 && (
          <span className="text-[10px] text-ink3 ml-0.5">{wordCount}w</span>
        )}
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title="Copy to clipboard"
            className="ml-auto w-6 h-6 flex items-center justify-center rounded text-ink3 hover:text-ink hover:bg-hover transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function Textarea({ value, onChange, rows = 4, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y leading-relaxed"
    />
  )
}

function MetaField({ label, editing, value, onChange, type = 'text', options, className }: {
  label: string; editing: boolean; value: string; onChange: (v: string) => void
  type?: 'text' | 'date' | 'select' | 'url'; options?: string[]; className?: string
}) {
  if (!editing && !value) return null
  const inputCls = 'w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/40'
  return (
    <div className={className}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1.5">
        {editing ? (
          type === 'select' && options ? (
            <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
              {options.map((o) => <option key={o} value={o}>{o || 'None'}</option>)}
            </select>
          ) : (
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
          )
        ) : (
          <p className="text-sm text-ink break-words">{value}</p>
        )}
      </div>
    </div>
  )
}
