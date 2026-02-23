import { useState } from 'react'
import toast from 'react-hot-toast'
import { X, Plus, Wand2 } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { appendRow } from '@/lib/sheets'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Journal', 'Work', 'Learning', 'Health', 'Finance', 'Ideas', 'Personal', 'Other']
const STATUSES   = ['Pending', 'In Progress', 'In Review', 'Done', 'Blocked']

export function NewRowModal() {
  const showNewRow    = useBrainStore((s) => s.showNewRow)
  const setShowNewRow = useBrainStore((s) => s.setShowNewRow)
  const settings      = useBrainStore((s) => s.settings)
  const { refresh }   = useSheetSync()
  const { run: runAI, loading: aiLoading } = useAI()

  const [form, setForm] = useState({
    title: '', category: '', subCategory: '', original: '',
    tags: '', taskStatus: 'Pending', dueDate: '',
  })
  const [saving, setSaving] = useState(false)

  if (!showNewRow) return null

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const close = () => {
    setShowNewRow(false)
    setForm({ title: '', category: '', subCategory: '', original: '', tags: '', taskStatus: 'Pending', dueDate: '' })
  }

  async function handleAIEnhance() {
    if (!form.original && !form.title) {
      toast.error('Type something first')
      return
    }
    const result = await runAI('all', form.original || form.title)
    if (result.rewritten || result.tags || result.category) {
      setForm((f) => ({
        ...f,
        title:    result.rewritten ? f.title || result.rewritten.split('\n')[0].slice(0, 80) : f.title,
        category: result.category || f.category,
        tags:     result.tags || f.tags,
      }))
      toast.success('AI enhanced!')
    }
  }

  async function handleSubmit() {
    if (!form.title && !form.original) {
      toast.error('Please enter a title or content')
      return
    }
    setSaving(true)
    try {
      await appendRow({
        srNo: '', title: form.title, createdAt: new Date().toISOString(),
        updatedAt: '', category: form.category, subCategory: form.subCategory,
        original: form.original, rewritten: '', actionItems: '', dueDate: form.dueDate,
        taskStatus: form.taskStatus, links: '', mediaUrl: '', tags: form.tags, messageId: '',
      })
      toast.success('Added to Google Sheet')
      await refresh()
      close()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors'
  const labelCls = 'block text-xs font-medium text-ink2 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" />
            <h2 className="font-semibold text-sm text-ink">New entry</h2>
          </div>
          <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink3 hover:bg-hover hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">

          {/* Title */}
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="What's this about?"
              autoFocus
            />
          </div>

          {/* Original content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>Content / Note</label>
              {settings.openAiKey && (
                <button
                  onClick={handleAIEnhance}
                  disabled={aiLoading}
                  className="flex items-center gap-1 text-[11px] text-brand hover:underline disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" />
                  {aiLoading ? 'Enhancing...' : 'AI enhance'}
                </button>
              )}
            </div>
            <textarea
              className={cn(inputCls, 'resize-none')}
              rows={4}
              value={form.original}
              onChange={(e) => set('original', e.target.value)}
              placeholder="Paste your raw idea, note, or thought..."
            />
          </div>

          {/* Category + Sub-category */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sub-category</label>
              <input
                className={inputCls}
                value={form.subCategory}
                onChange={(e) => set('subCategory', e.target.value)}
                placeholder="e.g. Career"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags <span className="text-ink3 font-normal">(comma-separated)</span></label>
            <input
              className={inputCls}
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="ai, idea, career"
            />
          </div>

          {/* Status + Due date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.taskStatus} onChange={(e) => set('taskStatus', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due date</label>
              <input
                className={inputCls}
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border safe-bottom">
          <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
            {saving ? 'Adding...' : 'Add entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}
