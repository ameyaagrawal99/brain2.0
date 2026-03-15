/**
 * WikiLinkedText — renders plain text with [[Entry Title]] wiki-style links.
 *
 * Matching rules (to avoid wrong connections):
 *   • Case-insensitive, trimmed exact title match only — no fuzzy matching.
 *   • Unresolved links are shown in muted red so the user knows they're broken.
 *   • Clicking a resolved link opens that entry's DetailModal.
 *
 * WikiTextarea — a drop-in textarea replacement that adds [[autocomplete.
 *   • Detects an unclosed [[ before the cursor.
 *   • Shows a floating dropdown of matching entry titles.
 *   • On selection, inserts [[Exact Title]] at cursor.
 */

import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Link2, AlertCircle } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import type { BrainRow } from '@/types/sheet'
import { cn } from '@/lib/utils'

/* ── WikiLinkedText ──────────────────────────────────────────────────────── */

interface WikiLinkedTextProps {
  text: string
  /** If omitted the component reads rows from the store */
  rows?: BrainRow[]
  className?: string
}

type Part =
  | { type: 'text'; content: string }
  | { type: 'link'; title: string; resolved: BrainRow | undefined }

function splitWikiLinks(text: string, titleMap: Map<string, BrainRow>): Part[] {
  const parts: Part[] = []
  const regex = /\[\[([^\]]+)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    const title = m[1].trim()
    parts.push({ type: 'link', title, resolved: titleMap.get(title.toLowerCase()) })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}

export function WikiLinkedText({ text, rows: propRows, className }: WikiLinkedTextProps) {
  const storeRows = useBrainStore((s) => s.rows)
  const openModal = useBrainStore((s) => s.openModal)
  const rows = propRows ?? storeRows

  // Build exact-match lookup once per rows change
  const titleMap = useMemo(() => {
    const m = new Map<string, BrainRow>()
    rows.forEach((r) => {
      if (r.title?.trim()) m.set(r.title.toLowerCase().trim(), r)
    })
    return m
  }, [rows])

  const parts = useMemo(() => splitWikiLinks(text || '', titleMap), [text, titleMap])

  // Short-circuit if no wiki links detected
  if (!parts.some((p) => p.type === 'link')) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.content}</span>
        if (part.resolved) {
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); openModal(part.resolved!) }}
              className="inline-flex items-center gap-0.5 text-brand underline underline-offset-2 hover:opacity-75 transition-opacity font-medium cursor-pointer"
              title={`Open: ${part.title}`}
            >
              <Link2 className="w-2.5 h-2.5 shrink-0" />
              {part.title}
            </button>
          )
        }
        // Broken link — entry not found
        return (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 text-red-400 line-through text-[0.9em] cursor-help"
            title={`Entry not found: ${part.title}`}
          >
            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
            {part.title}
          </span>
        )
      })}
    </span>
  )
}

/* ── WikiTextarea ────────────────────────────────────────────────────────── */

interface WikiTextareaProps {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  className?: string
  /** Passed so the component can suggest relevant entries */
  allRows?: BrainRow[]
}

export function WikiTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  className,
  allRows: propRows,
}: WikiTextareaProps) {
  const storeRows  = useBrainStore((s) => s.rows)
  const allRows    = propRows ?? storeRows
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  interface Suggest { items: BrainRow[]; replaceFrom: number; replaceEnd: number }
  const [suggest, setSuggest] = useState<Suggest | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // Build lowercase→row lookup
  const titleMap = useMemo(() => {
    const m = new Map<string, BrainRow>()
    allRows.forEach((r) => { if (r.title?.trim()) m.set(r.title.toLowerCase().trim(), r) })
    return m
  }, [allRows])

  const detect = useCallback((val: string, cursorPos: number) => {
    const before = val.slice(0, cursorPos)
    // Match an unclosed [[ followed by any characters that haven't hit a closing ]]
    const match = before.match(/\[\[([^\]]*)$/)
    if (!match) { setSuggest(null); return }
    const query = match[1].toLowerCase()
    const items = allRows
      .filter((r) => r.title?.trim() && r.title.toLowerCase().includes(query))
      .slice(0, 8)
    if (!items.length) { setSuggest(null); return }
    // replaceFrom: index in val where [[ starts
    const replaceFrom = cursorPos - match[0].length
    setSuggest({ items, replaceFrom, replaceEnd: cursorPos })
    setActiveIdx(0)
  }, [allRows])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value
    onChange(newVal)
    detect(newVal, e.target.selectionStart ?? newVal.length)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggest) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggest.items.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertLink(suggest.items[activeIdx])
    }
    if (e.key === 'Escape') setSuggest(null)
  }

  function insertLink(row: BrainRow) {
    if (!suggest) return
    const before = value.slice(0, suggest.replaceFrom)
    const after  = value.slice(suggest.replaceEnd)
    const inserted = `[[${row.title}]]`
    const next = before + inserted + after
    onChange(next)
    setSuggest(null)
    // Restore cursor position after the inserted link
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      const pos = suggest.replaceFrom + inserted.length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!suggest) return
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggest(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [suggest])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2.5 text-sm bg-surface2 border border-border rounded-lg text-ink',
          'placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40 resize-y leading-relaxed',
          className,
        )}
      />

      {/* Autocomplete dropdown */}
      {suggest && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <div className="px-2.5 py-1.5 border-b border-border bg-surface2 flex items-center gap-1.5">
            <Link2 className="w-3 h-3 text-brand shrink-0" />
            <span className="text-[10px] text-ink3 font-medium">Link to entry — ↑↓ navigate · Enter to select · Esc to dismiss</span>
          </div>
          {suggest.items.map((row, idx) => (
            <button
              key={row._rowIndex}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertLink(row) }}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm',
                idx === activeIdx ? 'bg-brand/10 text-brand' : 'hover:bg-hover text-ink',
              )}
            >
              <Link2 className="w-3 h-3 shrink-0 text-brand/60" />
              <span className="flex-1 truncate font-medium">{row.title}</span>
              {row.category && (
                <span className="text-[10px] text-ink3 shrink-0">{row.category}</span>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 bg-surface2 border-t border-border">
            <p className="text-[10px] text-ink3">
              Type <code className="bg-surface px-0.5 rounded">[[</code> in any text to link entries
            </p>
          </div>
        </div>
      )}

      {/* Hint: only shown when no dropdown and value is empty */}
      {!suggest && !value && (
        <p className="absolute bottom-2 right-2.5 text-[10px] text-ink3 pointer-events-none select-none">
          Type <code>[[</code> to link entries
        </p>
      )}
    </div>
  )
}

/* ── Utility: does the text contain any wiki link syntax? ──────────────── */
export function hasWikiLinks(text: string): boolean {
  return /\[\[[^\]]+\]\]/.test(text)
}
