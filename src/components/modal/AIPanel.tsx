import { useState } from 'react'
import { X, Wand2, Zap, Brain, Tag, CheckSquare, FileText, Sparkles, Key, Download } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { useFilters } from '@/hooks/useFilters'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { BrainRow } from '@/types/sheet'

type AIMode = 'quick' | 'bulk' | 'digest' | 'chat' | 'export'

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
  const showAIPanel    = useBrainStore((s) => s.showAIPanel)
  const setShowAIPanel = useBrainStore((s) => s.setShowAIPanel)
  const settings       = useBrainStore((s) => s.settings)
  const rows           = useBrainStore((s) => s.rows)
  const { saveRow }    = useSheetSync()
  const { run: runAI, loading: aiLoading } = useAI()
  const { filteredRows } = useFilters()

  const [mode, setMode]               = useState<AIMode>('quick')
  const [quickText, setQuickText]     = useState('')
  const [quickResult, setQuickResult] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [digest, setDigest]           = useState<string | null>(null)
  const [chatInput, setChatInput]     = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])

  // Export tab state
  const [exportFormat, setExportFormat] = useState<'md' | 'csv'>('md')
  const [exportScope,  setExportScope]  = useState<'all' | 'filtered'>('filtered')

  if (!showAIPanel) return null

  /* ── Quick AI ── */
  async function handleQuickProcess(action: 'rewrite' | 'tags' | 'actions' | 'all') {
    if (!quickText.trim()) { toast.error('Enter some text first'); return }
    const result = await runAI(action, quickText)
    const out = action === 'all'
      ? [result.rewritten, result.tags && 'Tags: ' + result.tags, result.actionItems].filter(Boolean).join('\n\n')
      : (result.rewritten || result.tags || result.actionItems || 'No result')
    setQuickResult(out || null)
  }

  /* ── Bulk enhance ── */
  async function handleBulkEnhance() {
    const toProcess = rows.filter((r) => !r.rewritten && (r.original || r.title))
    if (!toProcess.length) { toast('All entries already enhanced'); return }
    setBulkProgress({ done: 0, total: toProcess.length })
    let done = 0
    for (const row of toProcess) {
      try {
        const result = await runAI('all', row.original || row.title)
        const fields: Record<string, string> = {}
        if (result.rewritten)   fields.rewritten   = result.rewritten
        if (result.tags)        fields.tags         = row.tags || result.tags
        if (result.category)    fields.category     = row.category || result.category
        if (result.actionItems) fields.actionItems  = result.actionItems
        if (Object.keys(fields).length) await saveRow(row._rowIndex, fields)
      } catch { /* skip failed rows */ }
      done++
      setBulkProgress({ done, total: toProcess.length })
    }
    toast.success(`Enhanced ${done} entries!`)
    setBulkProgress(null)
  }

  /* ── Digest ── */
  async function handleGenerateDigest() {
    const sample = filteredRows.slice(0, 20)
    if (!sample.length) { toast.error('No entries to summarize'); return }
    const context = sample.map((r, i) =>
      `${i + 1}. [${r.category}] ${r.title}: ${(r.rewritten || r.original || '').slice(0, 200)}`
    ).join('\n')
    const prompt = `You are a personal assistant. Here are recent journal entries:\n\n${context}\n\nWrite a thoughtful weekly digest (3-5 sentences): key themes, accomplishments, patterns, and suggested focus for the week.`
    const result = await runAI('rewrite', prompt)
    setDigest(result.rewritten || 'Could not generate digest')
  }

  /* ── Chat ── */
  async function handleChat() {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatInput('')
    setChatHistory((h) => [...h, { role: 'user', text: userMsg }])
    const context = rows.slice(0, 30).map((r) =>
      `[${r.category}] ${r.title}: ${(r.rewritten || r.original || '').slice(0, 150)}`
    ).join('\n')
    const prompt = `You are an AI assistant with access to the user's personal knowledge base. Context:\n${context}\n\nUser question: ${userMsg}\n\nAnswer helpfully and specifically based on their notes.`
    const result = await runAI('rewrite', prompt)
    setChatHistory((h) => [...h, { role: 'ai', text: result.rewritten || 'No response' }])
  }

  /* ── Export ── */
  function handleExport() {
    const data = exportScope === 'all' ? rows : filteredRows
    if (!data.length) { toast.error('No entries to export'); return }
    const ts = new Date().toISOString().slice(0, 10)
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
    { key: 'export', label: 'Export',        icon: Download },
  ]

  const hasKey = !!settings.openAiKey

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-ink leading-none">AI Features</h2>
              <p className="text-[11px] text-ink3 mt-0.5">{rows.length} entries in your brain</p>
            </div>
          </div>
          <button
            onClick={() => setShowAIPanel(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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

            {/* QUICK AI */}
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
                <div className="flex flex-wrap gap-2">
                  {[
                    { action: 'rewrite' as const, label: 'Rewrite',         icon: Wand2 },
                    { action: 'tags'    as const, label: 'Generate tags',    icon: Tag },
                    { action: 'actions' as const, label: 'Extract actions',  icon: CheckSquare },
                    { action: 'all'     as const, label: 'Enhance all',      icon: Sparkles },
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

            {/* BULK ENHANCE */}
            {mode === 'bulk' && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Bulk AI Enhancement</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Automatically rewrites, tags, and extracts action items for all entries that haven't been enhanced yet.
                    Costs approx $0.001 per entry.
                  </p>
                </div>
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
                    <div className="text-2xl font-bold text-amber-500">{rows.filter((r) => !r.rewritten && (r.original || r.title)).length}</div>
                    <div className="text-xs text-ink3 mt-0.5">Pending</div>
                  </div>
                </div>
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
                <Button variant="primary" size="sm" onClick={handleBulkEnhance} loading={aiLoading || !!bulkProgress} className="w-full justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                  {bulkProgress ? `Processing… (${bulkProgress.done}/${bulkProgress.total})` : 'Start Bulk Enhancement'}
                </Button>
              </div>
            )}

            {/* WEEKLY DIGEST */}
            {mode === 'digest' && (
              <div className="space-y-4">
                <p className="text-xs text-ink2">Generate a weekly digest summarizing your recent entries, key themes, and suggested focus.</p>
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

            {/* CHAT */}
            {mode === 'chat' && (
              <div className="flex flex-col space-y-4">
                <p className="text-xs text-ink2">Ask questions about your notes. AI answers using your entries as context.</p>
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
                        {msg.text}
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

          </div>{/* end dimmed wrapper */}

          {/* EXPORT — always full opacity, no AI key required */}
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
