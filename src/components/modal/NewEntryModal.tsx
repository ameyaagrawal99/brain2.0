import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface NewEntryForm {
  title:       string
  category:    string
  subCategory: string
  original:    string
  rewritten:   string
  actionItems: string
  dueDate:     string
  taskStatus:  string
  tags:        string
  links:       string
}

const BLANK: NewEntryForm = {
  title: '', category: '', subCategory: '', original: '',
  rewritten: '', actionItems: '', dueDate: '', taskStatus: '',
  tags: '', links: '',
}

export function NewEntryModal() {
  const showNewRow    = useBrainStore((s) => s.showNewRow)
  const setShowNewRow = useBrainStore((s) => s.setShowNewRow)
  const settings      = useBrainStore((s) => s.settings)
  const { createRow } = useSheetSync()
  const { run: runAI, loading: aiLoading } = useAI()

  const [form, setForm] = useState<NewEntryForm>(BLANK)
  const [saving, setSaving] = useState(false)

  function patch(key: keyof NewEntryForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleEnhance() {
    if (!form.original.trim()) { toast.error('Write your note first'); return }
    const result = await runAI('all', form.original)
    setForm((f) => ({
      ...f,
      rewritten:   result.rewritten   ?? f.rewritten,
      tags:        result.tags        ?? f.tags,
      category:    result.category    ?? f.category,
      actionItems: result.actionItems ?? f.actionItems,
    }))
    toast.success('AI enhancement applied')
  }

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await createRow(form)
      setForm(BLANK)
      setShowNewRow(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={showNewRow}
      onClose={() => setShowNewRow(false)}
      title="New entry"
      size="lg"
    >
      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Title *</label>
          <input
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
            placeholder="What's this entry about?"
            autoFocus
          />
        </div>

        {/* Original note */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-ink2 uppercase tracking-wider">Your note</label>
            {settings.openAiKey && (
              <Button size="sm" variant="ghost" onClick={handleEnhance} loading={aiLoading}>
                <Wand2 className="w-3.5 h-3.5 text-brand" />
                <span className="text-brand text-xs">Enhance with AI</span>
              </Button>
            )}
          </div>
          <textarea
            value={form.original}
            onChange={(e) => patch('original', e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50 resize-y font-serif leading-relaxed"
            placeholder="Write your raw thoughts here…"
          />
        </div>

        {/* Rewritten (optional) */}
        {form.rewritten && (
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Rewritten (AI)</label>
            <textarea
              value={form.rewritten}
              onChange={(e) => patch('rewritten', e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 resize-y font-serif leading-relaxed"
            />
          </div>
        )}

        {/* Category + Sub-cat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Category</label>
            <input
              value={form.category}
              onChange={(e) => patch('category', e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
              placeholder="e.g. Learning"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Sub-category</label>
            <input
              value={form.subCategory}
              onChange={(e) => patch('subCategory', e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
              placeholder="e.g. Books"
            />
          </div>
        </div>

        {/* Action items */}
        {form.actionItems && (
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Action items</label>
            <textarea
              value={form.actionItems}
              onChange={(e) => patch('actionItems', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50 resize-y"
            />
          </div>
        )}

        {/* Status + Due */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Status</label>
            <select
              value={form.taskStatus}
              onChange={(e) => patch('taskStatus', e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              {['', 'Pending', 'In Progress', 'In Review', 'Done', 'Blocked'].map((o) => (
                <option key={o} value={o}>{o || 'None'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => patch('dueDate', e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Tags</label>
          <input
            value={form.tags}
            onChange={(e) => patch('tags', e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
            placeholder="tag1, tag2, tag3"
          />
        </div>

        {/* Links */}
        <div>
          <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1.5">Links</label>
          <input
            type="url"
            value={form.links}
            onChange={(e) => patch('links', e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
            placeholder="https://…"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={() => setShowNewRow(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} loading={saving}>
            Create entry
          </Button>
        </div>
      </div>
    </Modal>
  )
}
