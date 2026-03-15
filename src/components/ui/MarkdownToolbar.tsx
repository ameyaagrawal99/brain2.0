import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Bold, Italic, Heading2, List, ListOrdered, Minus, Quote, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrainStore } from '@/store/useBrainStore'
import type { BrainRow } from '@/types/sheet'

/* ─── Format application logic ───────────────────────────────────────── */

type Format = 'bold' | 'italic' | 'heading' | 'bullet' | 'numbered' | 'divider' | 'quote'

function applyFormat(
  textarea: HTMLTextAreaElement,
  format: Format,
  onChange: (val: string) => void,
) {
  const { value, selectionStart: ss, selectionEnd: se } = textarea
  const selected = value.slice(ss, se)
  const before   = value.slice(0, ss)
  const after    = value.slice(se)

  let newValue  = value
  let newSS     = ss
  let newSE     = se

  switch (format) {
    case 'bold': {
      const wrapped = `**${selected || 'bold text'}**`
      newValue = before + wrapped + after
      newSS = ss + 2
      newSE = ss + 2 + (selected || 'bold text').length
      break
    }
    case 'italic': {
      const wrapped = `*${selected || 'italic text'}*`
      newValue = before + wrapped + after
      newSS = ss + 1
      newSE = ss + 1 + (selected || 'italic text').length
      break
    }
    case 'heading': {
      // Prepend ## to the line containing the selection
      const lineStart = before.lastIndexOf('\n') + 1
      const prefix    = value.slice(0, lineStart)
      const rest      = value.slice(lineStart)
      const hasPrefix = rest.startsWith('## ')
      newValue = hasPrefix
        ? prefix + rest.slice(3)                    // toggle off
        : prefix + '## ' + rest
      const delta = hasPrefix ? -3 : 3
      newSS = ss + delta
      newSE = se + delta
      break
    }
    case 'bullet': {
      // Prepend "- " to every selected line
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l) => (l.startsWith('- ') ? l.slice(2) : `- ${l}`)).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
    case 'numbered': {
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l, i) => {
        const stripped = l.replace(/^\d+\.\s*/, '')
        return `${i + 1}. ${stripped}`
      }).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
    case 'divider': {
      const sep = '\n\n---\n\n'
      newValue = before + sep + after
      newSS = newSE = ss + sep.length
      break
    }
    case 'quote': {
      const lines  = selected ? selected.split('\n') : ['']
      const result = lines.map((l) => (l.startsWith('> ') ? l.slice(2) : `> ${l}`)).join('\n')
      newValue = before + result + after
      newSS    = ss
      newSE    = ss + result.length
      break
    }
  }

  onChange(newValue)

  // Restore cursor/selection after React re-render
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(newSS, newSE)
  })
}

/* ─── Toolbar button ─────────────────────────────────────────────────── */

interface ToolbarBtn {
  format: Format
  icon:   React.ElementType
  title:  string
}

const TOOLBAR_BUTTONS: ToolbarBtn[] = [
  { format: 'bold',     icon: Bold,        title: 'Bold (** **)' },
  { format: 'italic',   icon: Italic,      title: 'Italic (* *)' },
  { format: 'heading',  icon: Heading2,    title: 'Heading (##)' },
  { format: 'bullet',   icon: List,        title: 'Bullet list (-)' },
  { format: 'numbered', icon: ListOrdered, title: 'Numbered list (1.)' },
  { format: 'quote',    icon: Quote,       title: 'Blockquote (>)' },
  { format: 'divider',  icon: Minus,       title: 'Divider (---)' },
]

/* ─── Component ──────────────────────────────────────────────────────── */

interface MarkdownToolbarProps {
  value:       string
  onChange:    (val: string) => void
  rows?:       number
  placeholder?: string
  className?:  string
  disabled?:   boolean
  /** Pass all rows for [[wiki link]] autocomplete. Defaults to store rows. */
  allRows?:    BrainRow[]
}

interface WikiSuggest { items: BrainRow[]; replaceFrom: number; replaceEnd: number }

export function MarkdownToolbar({
  value,
  onChange,
  rows = 5,
  placeholder,
  className,
  disabled = false,
  allRows: propRows,
}: MarkdownToolbarProps) {
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const storeRows    = useBrainStore((s) => s.rows)
  const openModal    = useBrainStore((s) => s.openModal)
  const allRows      = propRows ?? storeRows
  const [focused, setFocused]       = useState(false)
  const [wikiSuggest, setWikiSuggest] = useState<WikiSuggest | null>(null)
  const [activeIdx, setActiveIdx]   = useState(0)

  const titleMap = useMemo(() => {
    const m = new Map<string, BrainRow>()
    allRows.forEach((r) => { if (r.title?.trim()) m.set(r.title.toLowerCase().trim(), r) })
    return m
  }, [allRows])

  const detectWiki = useCallback((val: string, cursorPos: number) => {
    const before = val.slice(0, cursorPos)
    const match  = before.match(/\[\[([^\]]*)$/)
    if (!match) { setWikiSuggest(null); return }
    const query = match[1].toLowerCase()
    const items = allRows
      .filter((r) => r.title?.trim() && r.title.toLowerCase().includes(query))
      .slice(0, 8)
    if (!items.length) { setWikiSuggest(null); return }
    setWikiSuggest({ items, replaceFrom: cursorPos - match[0].length, replaceEnd: cursorPos })
    setActiveIdx(0)
  }, [allRows])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    detectWiki(e.target.value, e.target.selectionStart ?? e.target.value.length)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!wikiSuggest) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, wikiSuggest.items.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertWikiLink(wikiSuggest.items[activeIdx]) }
    if (e.key === 'Escape') setWikiSuggest(null)
  }

  function insertWikiLink(row: BrainRow) {
    if (!wikiSuggest) return
    const before   = value.slice(0, wikiSuggest.replaceFrom)
    const after    = value.slice(wikiSuggest.replaceEnd)
    const inserted = `[[${row.title}]]`
    onChange(before + inserted + after)
    setWikiSuggest(null)
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      const pos = wikiSuggest.replaceFrom + inserted.length
      ta.setSelectionRange(pos, pos)
      ta.focus()
    })
  }

  // Close wiki dropdown on outside click
  useEffect(() => {
    if (!wikiSuggest) return
    function onDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWikiSuggest(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [wikiSuggest])

  // Silence unused var warning — openModal used in dropdown
  void openModal
  void titleMap

  return (
    <div className={cn('group flex flex-col gap-0', className)}>
      {/* Toolbar — always fully visible in edit mode */}
      <div
        className={cn(
          'flex flex-wrap gap-0.5 px-1.5 py-1 bg-surface border border-border border-b-0',
          'rounded-t-lg',
          focused ? 'border-brand/40' : '',
        )}
      >
        {TOOLBAR_BUTTONS.map(({ format, icon: Icon, title }) => (
          <button
            key={format}
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => {
              // Prevent textarea blur before we read selection
              e.preventDefault()
              if (textareaRef.current) {
                applyFormat(textareaRef.current, format, onChange)
              }
            }}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded text-ink3',
              'hover:bg-hover hover:text-ink transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          <span className="text-[10px] text-ink3 opacity-60 select-none">[[link]]</span>
          <span className="text-[10px] text-ink3 font-mono select-none">md</span>
        </div>
      </div>

      {/* Textarea — wrapped for wiki dropdown */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full bg-surface2 border border-border rounded-b-lg px-3 py-2.5',
            'text-sm text-ink placeholder:text-ink3',
            'focus:outline-none focus:ring-2 focus:ring-brand/40',
            'resize-none font-mono leading-relaxed',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'rounded-t-none',
          )}
        />

        {/* [[Wiki link]] autocomplete dropdown */}
        {wikiSuggest && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 z-50 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-2.5 py-1.5 border-b border-border bg-surface2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3 text-brand shrink-0" />
              <span className="text-[10px] text-ink3 font-medium">↑↓ navigate · Enter/Tab select · Esc dismiss</span>
            </div>
            {wikiSuggest.items.map((row, idx) => (
              <button
                key={row._rowIndex}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertWikiLink(row) }}
                className={cn(
                  'w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm',
                  idx === activeIdx ? 'bg-brand/10 text-brand' : 'hover:bg-hover text-ink',
                )}
              >
                <Link2 className="w-3 h-3 shrink-0 text-brand/60" />
                <span className="flex-1 truncate font-medium">{row.title}</span>
                {row.category && <span className="text-[10px] text-ink3 shrink-0">{row.category}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
