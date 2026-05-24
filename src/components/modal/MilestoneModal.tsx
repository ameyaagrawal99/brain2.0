import { useState, useEffect, useRef } from 'react'
import {
  X, Edit3, Trash2, Save, Loader2, Link2, Image as ImageIcon,
  Calendar, Sparkles, ChevronLeft,
} from 'lucide-react'
import { formatDistance, differenceInYears, differenceInMonths } from 'date-fns'
import { useBrainStore } from '@/store/useBrainStore'
import { useSheetSync } from '@/hooks/useSheetSync'
import { renderMarkdown } from '@/lib/markdown'
import { cn, isImageUrl } from '@/lib/utils'
import { monthDay, toLocalISODate } from '@/lib/date'
import type { SpecialDay } from '@/types/sheet'

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getMilestoneGradient(dateStr: string, isToday: boolean, isAnniversary: boolean) {
  if (isToday || isAnniversary) return 'from-rose-500 via-pink-500 to-fuchsia-500'
  const years = differenceInYears(new Date(), new Date(dateStr + 'T12:00:00'))
  if (years < 1) return 'from-violet-500 via-purple-500 to-indigo-500'
  if (years < 2) return 'from-indigo-500 via-blue-500 to-cyan-500'
  if (years < 5) return 'from-emerald-500 via-teal-500 to-green-500'
  return 'from-amber-500 via-orange-500 to-yellow-500'
}

function getElapsedText(dateStr: string) {
  const dateObj = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  const years  = differenceInYears(now, dateObj)
  const months = differenceInMonths(now, dateObj) % 12
  if (years === 0 && months === 0) return 'This month'
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''} ago`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''} ago`
  return `${years} yr ${months} mo ago`
}

function parseLinks(links: string): string[] {
  return links.split('\n').map(l => l.trim()).filter(Boolean)
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function MilestoneModal() {
  const selectedMilestone   = useBrainStore((s) => s.selectedMilestone)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const showNewMilestone    = useBrainStore((s) => s.showNewMilestone)
  const setShowNewMilestone = useBrainStore((s) => s.setShowNewMilestone)

  const { createSpecialDay, updateSpecialDayEntry, removeSpecialDay } = useSheetSync()

  const isOpen   = !!(selectedMilestone || showNewMilestone)
  const isCreate = showNewMilestone && !selectedMilestone

  // 'view' | 'edit'
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  // Form fields
  const [title,    setTitle]    = useState('')
  const [date,     setDate]     = useState('')
  const [emoji,    setEmoji]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [links,    setLinks]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imgError, setImgError] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Seed form when modal opens or switches day
  useEffect(() => {
    if (!isOpen) return
    if (isCreate) {
      setMode('edit')
      setTitle(''); setDate(''); setEmoji(''); setDesc(''); setImageUrl(''); setLinks('')
    } else if (selectedMilestone) {
      setMode('view')
      setTitle(selectedMilestone.title)
      setDate(selectedMilestone.date)
      setEmoji(selectedMilestone.emoji ?? '')
      setDesc(selectedMilestone.description ?? '')
      setImageUrl(selectedMilestone.imageUrl ?? '')
      setLinks(selectedMilestone.links ?? '')
    }
    setConfirmDelete(false)
    setImgError(false)
  }, [isOpen, isCreate, selectedMilestone])

  // Auto-grow description textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el && mode === 'edit') {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [desc, mode])

  function close() {
    setSelectedMilestone(null)
    setShowNewMilestone(false)
    setConfirmDelete(false)
  }

  async function handleSave() {
    if (!title.trim()) { return }
    if (!date.trim()) { return }
    setSaving(true)
    try {
      if (isCreate) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        await createSpecialDay({
          id,
          title: title.trim(),
          date:  date.trim(),
          emoji: emoji.trim() || undefined,
          description: desc.trim() || undefined,
          imageUrl:    imageUrl.trim() || undefined,
          links:       links.trim() || undefined,
        })
        close()
      } else if (selectedMilestone) {
        const updated: SpecialDay = {
          ...selectedMilestone,
          title: title.trim(),
          date:  date.trim(),
          emoji: emoji.trim() || undefined,
          description: desc.trim() || undefined,
          imageUrl:    imageUrl.trim() || undefined,
          links:       links.trim() || undefined,
        }
        await updateSpecialDayEntry(updated)
        setSelectedMilestone(updated)
        setMode('view')
      }
    } catch {
      // toast shown by hook
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedMilestone) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await removeSpecialDay(selectedMilestone.id)
      close()
    } catch {
      // toast shown by hook
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  const today   = toLocalISODate()
  const todayMD = monthDay(today)
  const dayDate = selectedMilestone?.date ?? date
  const isToday       = dayDate === today
  const isAnniversary = !!dayDate && dayDate !== today && dayDate.slice(5) === todayMD

  const gradient  = dayDate ? getMilestoneGradient(dayDate, isToday, isAnniversary) : 'from-violet-500 via-purple-500 to-indigo-500'
  const elapsed   = dayDate ? getElapsedText(dayDate) : ''
  const imgToShow = (imageUrl || selectedMilestone?.imageUrl || '')
  const showImg   = !imgError && !!imgToShow && isImageUrl(imgToShow)
  const parsedLinks = parseLinks(links || selectedMilestone?.links || '')

  const displayEmoji = emoji || selectedMilestone?.emoji || '✨'
  const displayTitle = title || selectedMilestone?.title || ''

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={close}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-scaleIn bg-surface"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Gradient hero header ── */}
          <div className={cn(
            'relative bg-gradient-to-br shrink-0',
            gradient,
          )}>
            {/* Close */}
            <button
              onClick={close}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Edit / Back button */}
            {!isCreate && (
              <button
                onClick={() => mode === 'view' ? setMode('edit') : setMode('view')}
                className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors text-xs font-medium"
              >
                {mode === 'view' ? (
                  <><Edit3 className="w-3.5 h-3.5" /> Edit</>
                ) : (
                  <><ChevronLeft className="w-3.5 h-3.5" /> View</>
                )}
              </button>
            )}

            {/* Hero content */}
            <div className="px-6 pt-10 pb-6 text-center text-white">
              {/* Shimmer on anniversary/today */}
              {(isToday || isAnniversary) && (
                <div className="milestone-shimmer absolute inset-0 pointer-events-none" />
              )}

              <div className="text-5xl mb-3 relative z-10 drop-shadow-lg select-none">
                {displayEmoji}
              </div>
              <h2 className="text-xl font-bold leading-tight relative z-10 drop-shadow-sm font-serif">
                {displayTitle || 'New Milestone'}
              </h2>

              {dayDate && (
                <p className="mt-2 text-sm text-white/80 relative z-10">
                  {new Date(dayDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {elapsed && <span className="ml-2 opacity-70">· {elapsed}</span>}
                </p>
              )}

              {/* Badge */}
              {isToday && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-semibold backdrop-blur-sm relative z-10">
                  🎉 Today!
                </span>
              )}
              {isAnniversary && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-white/25 text-white text-xs font-semibold backdrop-blur-sm relative z-10">
                  🎂 Anniversary!
                </span>
              )}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* VIEW MODE */}
            {mode === 'view' && selectedMilestone && (
              <div className="p-5 space-y-4">

                {/* Image */}
                {showImg && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img
                      src={imgToShow}
                      alt={selectedMilestone.title}
                      className="w-full max-h-64 object-cover"
                      onError={() => setImgError(true)}
                    />
                  </div>
                )}

                {/* Description */}
                {selectedMilestone.description && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-2">Memory</p>
                    <div
                      className="md-body prose-journal text-sm leading-relaxed text-ink2"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedMilestone.description) }}
                    />
                  </div>
                )}

                {/* Links */}
                {parsedLinks.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-2 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Links
                    </p>
                    <div className="space-y-1.5">
                      {parsedLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-brand hover:underline truncate"
                        >
                          <Link2 className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          <span className="truncate">{link}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!selectedMilestone.description && !showImg && parsedLinks.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-ink3 opacity-40" />
                    <p className="text-sm text-ink3">No details yet — click Edit to add your memories!</p>
                  </div>
                )}
              </div>
            )}

            {/* EDIT / CREATE MODE */}
            {mode === 'edit' && (
              <div className="p-5 space-y-4">

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Visa Approved!"
                    className="w-full bg-surface2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    autoFocus
                  />
                </div>

                {/* Date + Emoji row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5">Emoji</label>
                    <input
                      type="text"
                      value={emoji}
                      onChange={e => setEmoji(e.target.value)}
                      placeholder="🎉"
                      maxLength={8}
                      className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-xl text-center focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5">
                    Description <span className="text-ink3 font-normal normal-case tracking-normal">(supports **bold**, *italic*, lists…)</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={desc}
                    onChange={e => { setDesc(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                    placeholder={"Write your memory here...\n\nYou can use **bold**, *italic*, bullet lists, headings, etc."}
                    rows={5}
                    className="w-full bg-surface2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Image URL <span className="text-ink3 font-normal normal-case tracking-normal">(paste any image link)</span>
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => { setImageUrl(e.target.value); setImgError(false) }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-surface2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  {/* Preview */}
                  {imageUrl && isImageUrl(imageUrl) && !imgError && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-border max-h-40">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover max-h-40"
                        onError={() => setImgError(true)}
                      />
                    </div>
                  )}
                  {imageUrl && imgError && (
                    <p className="mt-1 text-[11px] text-red-500">Could not load this image URL</p>
                  )}
                </div>

                {/* Links */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink3 mb-1.5 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Links <span className="text-ink3 font-normal normal-case tracking-normal">(one per line)</span>
                  </label>
                  <textarea
                    value={links}
                    onChange={e => setLinks(e.target.value)}
                    placeholder={"https://example.com/article\nhttps://drive.google.com/..."}
                    rows={3}
                    className="w-full bg-surface2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Footer actions ── */}
          <div className="shrink-0 px-5 py-4 border-t border-border flex items-center gap-2 bg-surface">
            {/* Delete (view mode only, for existing milestones) */}
            {mode === 'view' && selectedMilestone && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                  confirmDelete
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                )}
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-ink3 hover:text-ink px-2"
              >
                Cancel
              </button>
            )}

            <div className="flex-1" />

            {/* Cancel (edit/create mode) */}
            {mode === 'edit' && !isCreate && (
              <button
                onClick={() => { setMode('view'); setImgError(false) }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-ink3 hover:text-ink hover:bg-hover transition-colors"
              >
                Cancel
              </button>
            )}
            {isCreate && (
              <button
                onClick={close}
                className="px-4 py-2 rounded-xl text-xs font-medium text-ink3 hover:text-ink hover:bg-hover transition-colors"
              >
                Cancel
              </button>
            )}

            {/* Save (edit/create) */}
            {mode === 'edit' && (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !date.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isCreate ? 'Save Milestone' : 'Save Changes'}
              </button>
            )}

            {/* Close (view mode) */}
            {mode === 'view' && (
              <button
                onClick={close}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-surface2 text-ink hover:bg-hover transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
