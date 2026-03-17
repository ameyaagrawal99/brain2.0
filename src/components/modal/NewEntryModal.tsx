import { useState, useMemo, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LinkPicker, LinkTypeBadge, LINK_TYPE_COLORS } from '@/components/ui/LinkPicker'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { useAI } from '@/hooks/useAI'
import { parsePeople } from '@/lib/contacts'
import { parseTags } from '@/lib/utils'
import { formatLink } from '@/lib/linkGraph'
import type { LinkType } from '@/types/sheet'
import {
  Wand2, ChevronDown, ChevronUp, X, Link2, Users, Tag, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

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
  people:      string
}

const BLANK: NewEntryForm = {
  title: '', category: '', subCategory: '', original: '',
  rewritten: '', actionItems: '', dueDate: '', taskStatus: '',
  tags: '', links: '', people: '',
}

interface LinkedEntry {
  title: string
  type: LinkType
}

function CollapsibleSection({
  title, icon, children, defaultOpen = false,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface2/60 hover:bg-hover transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-ink3">{icon}</span>}
          <span className="text-xs font-semibold text-ink2 uppercase tracking-wider">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-ink3" /> : <ChevronDown className="w-3.5 h-3.5 text-ink3" />}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

function TagsInput({
  value, onChange, suggestions,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
}) {
  const [inputVal, setInputVal] = useState('')
  const [showSug, setShowSug]   = useState(false)
  const tags = parseTags(value)

  const filtered = useMemo(() => {
    const q = inputVal.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !tags.includes(s)).slice(0, 8)
  }, [inputVal, suggestions, tags])

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    if (!clean || tags.includes(clean)) return
    const next = [...tags, clean].join(', ')
    onChange(next)
    setInputVal('')
    setShowSug(false)
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(', '))
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault()
      addTag(inputVal)
    }
    if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-surface2 border border-border rounded-lg min-h-[38px]">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-xs bg-brand/10 text-brand border border-brand/20 rounded-full px-2 py-0.5 font-medium">
            #{t}
            <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSug(true) }}
          onKeyDown={handleKey}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent text-ink placeholder:text-ink3 focus:outline-none"
        />
      </div>
      {showSug && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-hover flex items-center gap-1.5"
            >
              <Tag className="w-3 h-3 text-brand/60 shrink-0" />
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PeopleInput({
  value, onChange, suggestions,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
}) {
  const [inputVal, setInputVal] = useState('')
  const [showSug, setShowSug]   = useState(false)
  const people = parsePeople(value)

  const filtered = useMemo(() => {
    const q = inputVal.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !people.includes(s)).slice(0, 8)
  }, [inputVal, suggestions, people])

  function addPerson(name: string) {
    const clean = name.trim()
    if (!clean || people.includes(clean)) return
    onChange([...people, clean].join(', '))
    setInputVal('')
    setShowSug(false)
  }

  function removePerson(name: string) {
    onChange(people.filter((p) => p !== name).join(', '))
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault()
      addPerson(inputVal)
    }
    if (e.key === 'Backspace' && !inputVal && people.length > 0) {
      removePerson(people[people.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 bg-surface2 border border-border rounded-lg min-h-[38px]">
        {people.map((name) => (
          <span key={name} className="flex items-center gap-1 text-xs bg-surface border border-border2 rounded-full px-2 py-0.5 font-medium text-ink">
            <span className="w-3.5 h-3.5 rounded-full bg-brand/20 text-brand flex items-center justify-center text-[8px] font-bold shrink-0">
              {name[0]?.toUpperCase()}
            </span>
            {name}
            <button type="button" onClick={() => removePerson(name)} className="hover:text-red-400 ml-0.5">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSug(true) }}
          onKeyDown={handleKey}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder={people.length === 0 ? 'Add people…' : ''}
          className="flex-1 min-w-[80px] text-sm bg-transparent text-ink placeholder:text-ink3 focus:outline-none"
        />
      </div>
      {showSug && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addPerson(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-hover flex items-center gap-1.5"
            >
              <Users className="w-3 h-3 text-brand/60 shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function NewEntryModal() {
  const showNewRow    = useBrainStore((s) => s.showNewRow)
  const setShowNewRow = useBrainStore((s) => s.setShowNewRow)
  const settings      = useBrainStore((s) => s.settings)
  const allRows       = useBrainStore((s) => s.rows)
  const contacts      = useBrainStore((s) => s.contacts)
  const customTags    = useBrainStore((s) => s.customTags)
  const { createRow } = useSheetSync()
  const { run: runAI, loading: aiLoading } = useAI()

  const [form, setForm]               = useState<NewEntryForm>(BLANK)
  const [saving, setSaving]           = useState(false)
  const [linkedEntries, setLinked]    = useState<LinkedEntry[]>([])
  const [showLinkPicker, setShowLP]   = useState(false)

  const allPeopleNames = useMemo(() => {
    const set = new Set<string>()
    allRows.forEach((r) => parsePeople(r.people ?? '').forEach((n) => set.add(n)))
    contacts.forEach((c) => set.add(c.name))
    return [...set].sort()
  }, [allRows, contacts])

  const allTagSuggestions = useMemo(() => {
    const set = new Set<string>()
    customTags.forEach((t) => set.add(t))
    allRows.forEach((r) => parseTags(r.tags).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [allRows, customTags])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    allRows.forEach((r) => { if (r.category) set.add(r.category) })
    return [...set].sort()
  }, [allRows])

  const allSubCategories = useMemo(() => {
    const set = new Set<string>()
    allRows.forEach((r) => { if (r.subCategory) set.add(r.subCategory) })
    return [...set].sort()
  }, [allRows])

  const currentLinksStr = linkedEntries.map((e) => formatLink(e.title, e.type)).join('\n')

  function patch(key: keyof NewEntryForm, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function removeLinkedEntry(title: string) {
    setLinked((prev) => prev.filter((e) => e.title !== title))
  }

  function handlePickerConfirm(links: { title: string; type: LinkType }[]) {
    setLinked((prev) => {
      const existingTitles = new Set(prev.map((e) => e.title))
      const newOnes = links.filter((l) => !existingTitles.has(l.title))
      return [...prev, ...newOnes]
    })
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
      const linksField = [
        form.links.trim(),
        currentLinksStr,
      ].filter(Boolean).join('\n')

      await createRow({ ...form, links: linksField })
      setForm(BLANK)
      setLinked([])
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

        {/* Rewritten (optional, only shown when AI fills it) */}
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

        {/* ── Details section (collapsible) ── */}
        <CollapsibleSection
          title="Details"
          icon={<Layers className="w-3.5 h-3.5" />}
        >
          <div className="space-y-3">
            {/* Category + Sub-cat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">Category</label>
                <AutocompleteInput
                  value={form.category}
                  onChange={(v) => patch('category', v)}
                  suggestions={allCategories}
                  placeholder="e.g. Learning"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">Sub-category</label>
                <AutocompleteInput
                  value={form.subCategory}
                  onChange={(v) => patch('subCategory', v)}
                  suggestions={allSubCategories}
                  placeholder="e.g. Books"
                />
              </div>
            </div>

            {/* Status + Due */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={form.taskStatus}
                  onChange={(e) => patch('taskStatus', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  {['', 'Pending', 'In Progress', 'In Review', 'Done', 'Blocked'].map((o) => (
                    <option key={o} value={o}>{o || 'None'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => patch('dueDate', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface2 border border-border rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">Tags</label>
              <TagsInput
                value={form.tags}
                onChange={(v) => patch('tags', v)}
                suggestions={allTagSuggestions}
              />
            </div>

            {/* People */}
            <div>
              <label className="block text-xs font-medium text-ink2 uppercase tracking-wider mb-1">People</label>
              <PeopleInput
                value={form.people}
                onChange={(v) => patch('people', v)}
                suggestions={allPeopleNames}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Links section (collapsible) ── */}
        <CollapsibleSection
          title="Linked Entries"
          icon={<Link2 className="w-3.5 h-3.5" />}
        >
          <div className="space-y-3">
            {/* Existing linked entries as chips */}
            {linkedEntries.length > 0 && (
              <div className="space-y-1.5">
                {linkedEntries.map((e) => (
                  <div key={e.title} className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-2.5 py-1.5">
                    <Link2 className="w-3 h-3 text-brand shrink-0" />
                    <span className="text-sm text-ink font-medium flex-1 min-w-0 truncate">{e.title}</span>
                    <LinkTypeBadge type={e.type} />
                    <button
                      type="button"
                      onClick={() => removeLinkedEntry(e.title)}
                      className="text-ink3 hover:text-red-400 transition-colors ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add link button */}
            <button
              type="button"
              onClick={() => setShowLP(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-brand border border-brand/20 bg-brand/5 hover:bg-brand/10 rounded-lg px-3 py-2 font-medium transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Search and add entries…
            </button>

            {/* Link picker inline */}
            {showLinkPicker && (
              <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-lg">
                <LinkPicker
                  onConfirm={handlePickerConfirm}
                  onClose={() => setShowLP(false)}
                  currentLinks={currentLinksStr}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

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

function AutocompleteInput({
  value, onChange, suggestions, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
}) {
  const [showSug, setShowSug] = useState(false)
  const filtered = useMemo(() => {
    const q = value.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 6)
  }, [value, suggestions])

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowSug(true) }}
        onFocus={() => setShowSug(true)}
        onBlur={() => setTimeout(() => setShowSug(false), 150)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50"
      />
      {showSug && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setShowSug(false) }}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-hover"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
