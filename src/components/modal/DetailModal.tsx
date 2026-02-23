import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { parseTags, formatDate, formatRelative, statusColor, categoryColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EditableFields } from '@/types/sheet'
import {
  Edit2, Save, X, Trash2, Tag, Wand2, CheckSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'

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
  const tags   = parseTags(merged.tags)

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
    const text = merged.original || merged.rewritten || merged.title
    const result = await runAI(action, text)
    if (result.rewritten)   patchField('rewritten', result.rewritten)
    if (result.tags)        patchField('tags', result.tags)
    if (result.category)    patchField('category', result.category)
    if (result.actionItems) patchField('actionItems', result.actionItems)
    if (Object.keys(result).length) {
      setEditing(true)
      toast.success('AI result applied — review and save')
    }
  }

  const catColor = categoryColor(merged.category) as string

  return (
    <Modal open={!!selectedRow} onClose={closeModal} size="xl">
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={merged.title}
                onChange={(e) => patchField('title' as keyof EditableFields, e.target.value)}
                className="w-full text-lg font-semibold text-ink bg-transparent border-b border-brand focus:outline-none pb-1"
                placeholder="Title"
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-semibold text-ink leading-snug">{merged.title || 'Untitled'}</h2>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {merged.category && (
                <Badge variant={catColor as 'brand'}>{merged.category}</Badge>
              )}
              {merged.subCategory && (
                <Badge variant="surface">{merged.subCategory}</Badge>
              )}
              {merged.taskStatus && (
                <div className="flex items-center gap-1">
                  <StatusDot status={merged.taskStatus} />
                  <span className="text-xs text-ink2">{merged.taskStatus}</span>
                </div>
              )}
              {merged.srNo && (
                <span className="text-xs text-ink3">#{merged.srNo}</span>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {settings.openAiKey && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAI(!showAI)}
                className={cn(showAI && 'text-brand bg-brand/8')}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">AI</span>
              </Button>
            )}
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="primary" onClick={handleSave}>
                  <Save className="w-3.5 h-3.5" />
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <Edit2 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Edit</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowDelete(!showDelete)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* AI panel */}
        {showAI && (
          <div className="px-5 py-3 bg-brand/5 border-b border-brand/10 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-brand">AI Actions:</span>
            {[
              { action: 'rewrite' as const, label: 'Rewrite' },
              { action: 'tags'    as const, label: 'Generate tags' },
              { action: 'actions' as const, label: 'Extract actions' },
              { action: 'all'     as const, label: 'Enhance all' },
            ].map(({ action, label }) => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => runAIAction(action)}
                loading={aiLoading}
              >
                <Wand2 className="w-3 h-3" />
                {label}
              </Button>
            ))}
            {aiError && <span className="text-xs text-danger">{aiError}</span>}
          </div>
        )}

        {/* Delete confirm */}
        {showDelete && (
          <div className="px-5 py-3 bg-danger/5 border-b border-danger/10 flex items-center justify-between gap-3">
            <span className="text-sm text-ink">Delete this entry? This cannot be undone.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Original */}
          <Section title="Original note">
            {editing ? (
              <Textarea
                value={merged.original}
                onChange={(v) => patchField('original', v)}
                rows={5}
                placeholder="Your original note…"
              />
            ) : (
              <div className="prose-journal text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {merged.original || <span className="text-ink3 italic">No original content</span>}
              </div>
            )}
          </Section>

          {/* Rewritten */}
          <Section title="Rewritten" badge="AI">
            {editing ? (
              <Textarea
                value={merged.rewritten}
                onChange={(v) => patchField('rewritten', v)}
                rows={5}
                placeholder="AI-polished version…"
              />
            ) : merged.rewritten ? (
              <div className="prose-journal text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {merged.rewritten}
              </div>
            ) : (
              <p className="text-sm text-ink3 italic">
                {settings.openAiKey
                  ? 'Click AI → Rewrite to generate a polished version'
                  : 'Add your OpenAI key in Settings to enable rewriting'}
              </p>
            )}
          </Section>

          {/* Action items */}
          {(merged.actionItems || editing) && (
            <Section title="Action items" icon={<CheckSquare className="w-3.5 h-3.5" />}>
              {editing ? (
                <Textarea
                  value={merged.actionItems}
                  onChange={(v) => patchField('actionItems', v)}
                  rows={4}
                  placeholder="1. First action&#10;2. Second action"
                />
              ) : (
                <ul className="space-y-1.5">
                  {merged.actionItems.split('\n').filter(Boolean).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <span className="w-5 h-5 rounded-md bg-brand/10 text-brand text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                        {i + 1}
                      </span>
                      {item.replace(/^\d+\.\s*/, '')}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <MetaField
              label="Category"
              editing={editing}
              value={merged.category}
              onChange={(v) => patchField('category', v)}
            />
            <MetaField
              label="Sub-category"
              editing={editing}
              value={merged.subCategory}
              onChange={(v) => patchField('subCategory', v)}
            />
            <MetaField
              label="Status"
              editing={editing}
              value={merged.taskStatus}
              onChange={(v) => patchField('taskStatus', v)}
              type="select"
              options={['', 'Pending', 'In Progress', 'In Review', 'Done', 'Blocked']}
            />
            <MetaField
              label="Due date"
              editing={editing}
              value={merged.dueDate}
              onChange={(v) => patchField('dueDate', v)}
              type="date"
            />
            <MetaField
              label="Links"
              editing={editing}
              value={merged.links}
              onChange={(v) => patchField('links', v)}
              className="sm:col-span-2"
            />
            <MetaField
              label="Media URL"
              editing={editing}
              value={merged.mediaUrl}
              onChange={(v) => patchField('mediaUrl', v)}
              className="sm:col-span-2"
            />
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-ink3" />
              <span className="text-xs font-medium text-ink2 uppercase tracking-wider">Tags</span>
            </div>
            {editing ? (
              <input
                value={merged.tags}
                onChange={(e) => patchField('tags', e.target.value)}
                className="w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
                placeholder="tag1, tag2, tag3"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.length > 0
                  ? tags.map((t) => <span key={t} className="tag-chip">#{t}</span>)
                  : <span className="text-xs text-ink3">No tags</span>
                }
              </div>
            )}
          </div>

          {/* Footer meta */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink3 pt-2 border-t border-border">
            {merged.createdAt && <span>Created {formatDate(merged.createdAt)}</span>}
            {merged.updatedAt && <span>Updated {formatRelative(merged.updatedAt)}</span>}
            {merged.messageId && <span>ID: {merged.messageId}</span>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Helper sub-components ─────────────────────────────────────────────── */

function Section({
  title, badge, icon, children,
}: {
  title: string; badge?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-medium text-ink2 uppercase tracking-wider">{title}</span>
        {badge && (
          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Textarea({
  value, onChange, rows = 4, placeholder,
}: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50 resize-y font-sans leading-relaxed"
    />
  )
}

function MetaField({
  label, editing, value, onChange, type = 'text', options, className,
}: {
  label: string
  editing: boolean
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'date' | 'select'
  options?: string[]
  className?: string
}) {
  if (!editing && !value) return null
  return (
    <div className={className}>
      <div className="text-xs font-medium text-ink2 uppercase tracking-wider mb-1">{label}</div>
      {editing ? (
        type === 'select' && options ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
          >
            {options.map((o) => <option key={o} value={o}>{o || 'None'}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        )
      ) : (
        <p className="text-sm text-ink">{value}</p>
      )}
    </div>
  )
}
