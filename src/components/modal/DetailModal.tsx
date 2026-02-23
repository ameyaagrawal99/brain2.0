import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { parseTags, formatDate, formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EditableFields } from '@/types/sheet'
import { Edit2, Save, X, Trash2, Tag, Wand2, CheckSquare, ExternalLink, Calendar, Hash } from 'lucide-react'
import toast from 'react-hot-toast'

// Detect Google Sheets formula strings stored as text (not yet evaluated)
function isFormula(v: string): boolean {
  if (!v) return false
  const s = v.trim()
  return s.startsWith('=AI(') || s.startsWith('=IF(') || s.startsWith('=IFERROR(') || s.startsWith('=ARRAYFORMULA(')
}

// Clean a value that might be a formula placeholder
function cleanVal(v: string): string {
  return isFormula(v) ? '' : (v || '')
}

const CATEGORY_OPTIONS = ['', 'Journal', 'Work', 'Learning', 'Health', 'Finance', 'Ideas', 'Personal', 'Other']
const STATUS_OPTIONS   = ['', 'Pending', 'In Progress', 'In Review', 'Done', 'Blocked']

export function DetailModal() {
  const selectedRow    = useBrainStore((s) => s.selectedRow)
  const closeModal     = useBrainStore((s) => s.closeModal)
  const settings       = useBrainStore((s) => s.settings)

  const { saveRow, removeRow } = useSheetSync()
  const { run: runAI, loading: aiLoading, error: aiError } = useAI()

  const [editing, setEditing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [fields, setFields] = useState<Partial<EditableFields>>({})

  if (!selectedRow) return null
  const row    = selectedRow
  const merged = { ...row, ...fields }
  const tags   = parseTags(cleanVal(merged.tags))

  const original    = cleanVal(merged.original)
  const rewritten   = cleanVal(merged.rewritten)
  const actionItems = cleanVal(merged.actionItems)
  const links       = cleanVal(merged.links)
  const mediaUrl    = cleanVal(merged.mediaUrl)

  function patchField(key: keyof EditableFields, val: string) {
    setFields((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    await saveRow(row._rowIndex, fields)
    setEditing(false)
    setFields({})
  }

  function handleCancel() {
    setEditing(false)
    setFields({})
  }

  async function handleDelete() {
    closeModal()
    await removeRow(row._rowIndex)
  }

  async function runAIAction(action: 'rewrite' | 'tags' | 'actions' | 'all') {
    const text = original || rewritten || merged.title
    if (!text) { toast.error('No text to process'); return }
    const result = await runAI(action, text)
    if (result.rewritten)   patchField('rewritten',   result.rewritten)
    if (result.tags)        patchField('tags',         result.tags)
    if (result.category)    patchField('category',     result.category)
    if (result.actionItems) patchField('actionItems',  result.actionItems)
    if (Object.keys(result).length) {
      setEditing(true)
      toast.success('AI applied — review and save')
    }
  }

  const actionLines = actionItems
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/^\d+\.\s*/, '').trim())
    .filter((l) => l.length > 0)

  const linkLines = links.split('\n').filter((l) => l.trim().startsWith('http'))

  return (
    <Modal open={!!selectedRow} onClose={closeModal} size="xl">
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header */}
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
            {/* Meta pills */}
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {settings.openAiKey && (
              <Button size="sm" variant="ghost" onClick={() => setShowAI(!showAI)}
                className={cn(showAI && 'text-brand bg-brand/8')}>
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">AI</span>
              </Button>
            )}
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

        {/* AI panel */}
        {showAI && (
          <div className="px-5 py-3 bg-brand/5 border-b border-brand/10 flex flex-wrap gap-2 items-center shrink-0">
            <span className="text-xs font-medium text-brand">AI:</span>
            {[
              { a: 'rewrite' as const, l: 'Rewrite' },
              { a: 'tags'    as const, l: 'Tags' },
              { a: 'actions' as const, l: 'Actions' },
              { a: 'all'     as const, l: 'Enhance all' },
            ].map(({ a, l }) => (
              <Button key={a} size="sm" variant="outline" onClick={() => runAIAction(a)} loading={aiLoading}>
                <Wand2 className="w-3 h-3" />{l}
              </Button>
            ))}
            {aiError && <span className="text-xs text-danger ml-1">{aiError}</span>}
          </div>
        )}

        {/* Delete confirm */}
        {showDelete && (
          <div className="px-5 py-3 bg-danger/5 border-b border-danger/10 flex items-center justify-between gap-3 shrink-0">
            <span className="text-sm text-ink">Delete this entry? Cannot be undone.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Original note */}
          <Section title="Original note">
            {editing ? (
              <Textarea value={merged.original} onChange={(v) => patchField('original', v)} rows={5} placeholder="Your original note..." />
            ) : original ? (
              <div className="prose-journal text-sm leading-relaxed text-ink whitespace-pre-wrap break-words">{original}</div>
            ) : (
              <p className="text-sm text-ink3 italic">No content</p>
            )}
          </Section>

          {/* Rewritten */}
          <Section title="Rewritten" badge="AI">
            {editing ? (
              <Textarea value={merged.rewritten} onChange={(v) => patchField('rewritten', v)} rows={5} placeholder="AI-polished version..." />
            ) : rewritten ? (
              <div className="prose-journal text-sm leading-relaxed text-ink whitespace-pre-wrap break-words">{rewritten}</div>
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
            {(links || editing) && (
              <div className="sm:col-span-2">
                {editing ? (
                  <MetaField label="Links" editing={editing} value={links} onChange={(v) => patchField('links', v)} className="sm:col-span-2" />
                ) : linkLines.length > 0 ? (
                  <div>
                    <SectionLabel>Links</SectionLabel>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {linkLines.map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-brand hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          {l.length > 50 ? l.slice(0, 50) + '...' : l}
                        </a>
                      ))}
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

          {/* Footer timestamps */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink3 pt-2 border-t border-border">
            {merged.createdAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Created {formatDate(merged.createdAt)}</span>}
            {merged.updatedAt && !isFormula(merged.updatedAt) && <span>Updated {formatRelative(merged.updatedAt)}</span>}
            {merged.messageId && !isFormula(merged.messageId) && <span>ID: {merged.messageId}</span>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* Helper sub-components */

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-ink3">{icon}</span>}
      <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{children}</span>
    </div>
  )
}

function Section({ title, badge, icon, children }: {
  title: string; badge?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon && <span className="text-ink3">{icon}</span>}
        <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wider">{title}</span>
        {badge && (
          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>
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
  type?: 'text' | 'date' | 'select'; options?: string[]; className?: string
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
