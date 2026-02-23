import { useState } from 'react'
import toast from 'react-hot-toast'
import { useBrainStore } from '@/store/useBrainStore'
import { appendRow } from '@/lib/sheets'
import { useSheetSync } from '@/hooks/useSheetSync'
import { Button } from '@/components/ui/Button'

export function NewRowModal() {
  const showNewRow    = useBrainStore((s) => s.showNewRow)
  const setShowNewRow = useBrainStore((s) => s.setShowNewRow)
  const { refresh }   = useSheetSync()

  const [form, setForm] = useState({
    title: '', category: '', subCategory: '', original: '',
    tags: '', taskStatus: '', dueDate: '',
  })
  const [saving, setSaving] = useState(false)

  if (!showNewRow) return null

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit() {
    if (!form.title && !form.original) {
      toast.error('Please enter at least a title or some text')
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
      toast.success('Entry added to Google Sheet ✓')
      await refresh()
      setShowNewRow(false)
      setForm({ title:'', category:'', subCategory:'', original:'', tags:'', taskStatus:'', dueDate:'' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add entry')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#22222e] border border-[#2e2e3e] focus:border-accent text-white/80
                    rounded-lg px-3 py-2 text-sm outline-none transition-colors`
  const labelCls = 'block text-xs text-white/40 font-medium mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setShowNewRow(false)}
    >
      <div className="bg-surface border border-[#2e2e3e] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e3e]">
          <h2 className="font-bold text-white">+ New Entry</h2>
          <button onClick={() => setShowNewRow(false)} className="text-white/30 hover:text-white/70 text-lg">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What's this about?" />
          </div>
          <div>
            <label className={labelCls}>Original text / idea</label>
            <textarea className={inputCls} rows={4} value={form.original} onChange={(e) => set('original', e.target.value)} placeholder="Paste your raw idea, note, or message here…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <input className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Journal" />
            </div>
            <div>
              <label className={labelCls}>Subcategory</label>
              <input className={inputCls} value={form.subCategory} onChange={(e) => set('subCategory', e.target.value)} placeholder="e.g. Career" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tags <span className="text-white/25">(comma-separated)</span></label>
            <input className={inputCls} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="ai, idea, career" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <input className={inputCls} value={form.taskStatus} onChange={(e) => set('taskStatus', e.target.value)} placeholder="e.g. In Progress" />
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input className={inputCls} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-[#2e2e3e]">
          <Button variant="ghost" size="sm" onClick={() => setShowNewRow(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Adding…' : '+ Add to Sheet'}
          </Button>
        </div>
      </div>
    </div>
  )
}
