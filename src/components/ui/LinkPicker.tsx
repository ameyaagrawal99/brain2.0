/**
 * LinkPicker — reusable component to search Brain 2.0 entries and create typed links.
 * Usage: pop it inside a portal or popover; call onConfirm with the selected links.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import { Search, X, Check, ChevronDown } from 'lucide-react'
import type { BrainRow, LinkType } from '@/types/sheet'
import { LINK_TYPE_LABELS } from '@/types/sheet'
import { expandChain } from '@/lib/linkGraph'

export interface LinkSelection {
  row:  BrainRow
  type: LinkType
}

interface Props {
  excludeRowIndex?: number        // the source entry (excluded from results)
  initialLinks?: LinkSelection[]  // pre-selected links
  onConfirm: (links: LinkSelection[]) => void
  onCancel:  () => void
}

const LINK_TYPES = Object.entries(LINK_TYPE_LABELS) as [LinkType, string][]

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text
  const q = query.trim()
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i === -1) return text
  return text.slice(0, i) + '**' + text.slice(i, i + q.length) + '**' + text.slice(i + q.length)
}

export function LinkPicker({ excludeRowIndex, initialLinks = [], onConfirm, onCancel }: Props) {
  const allRows = useBrainStore((s) => s.rows)
  const [query,    setQuery]    = useState('')
  const [selected, setSelected] = useState<Map<number, LinkSelection>>(
    new Map(initialLinks.map((l) => [l.row._rowIndex, l]))
  )
  const [chainPreview, setChainPreview] = useState<BrainRow[] | null>(null)
  const [expandEntry, setExpandEntry]   = useState<BrainRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = allRows.filter((r) => r._rowIndex !== excludeRowIndex && r.title?.trim())
    if (!q) return rows.slice(0, 30)
    return rows.filter((r) => {
      const hay = `${r.title} ${r.original} ${r.rewritten} ${r.tags}`.toLowerCase()
      return q.split(' ').every((w) => hay.includes(w))
    }).slice(0, 30)
  }, [allRows, query, excludeRowIndex])

  function toggleSelect(row: BrainRow) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(row._rowIndex)) {
        next.delete(row._rowIndex)
      } else {
        next.set(row._rowIndex, { row, type: 'references' })
      }
      return next
    })
  }

  function setLinkType(rowIndex: number, type: LinkType) {
    setSelected((prev) => {
      const entry = prev.get(rowIndex)
      if (!entry) return prev
      const next = new Map(prev)
      next.set(rowIndex, { ...entry, type })
      return next
    })
  }

  function showChain(row: BrainRow) {
    const chain = expandChain([row], allRows, 2, 10)
    setChainPreview(chain)
    setExpandEntry(row)
  }

  function addChain() {
    if (!chainPreview || !expandEntry) return
    setSelected((prev) => {
      const next = new Map(prev)
      if (!next.has(expandEntry._rowIndex)) {
        next.set(expandEntry._rowIndex, { row: expandEntry, type: 'references' })
      }
      chainPreview.forEach((r) => {
        if (r._rowIndex !== excludeRowIndex && !next.has(r._rowIndex)) {
          next.set(r._rowIndex, { row: r, type: 'related' })
        }
      })
      return next
    })
    setChainPreview(null)
    setExpandEntry(null)
  }

  const selectedArr = Array.from(selected.values())

  return (
    <div className="flex flex-col bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-ink">Add links</p>
        <button onClick={onCancel} className="text-ink3 hover:text-ink">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries by title, content, tags…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      {/* Chain preview */}
      {chainPreview && expandEntry && (
        <div className="mx-4 mb-2 p-3 bg-brand/5 border border-brand/20 rounded-xl shrink-0">
          <p className="text-xs font-semibold text-brand mb-1.5">
            Chain from "{expandEntry.title.slice(0, 30)}" (+{chainPreview.length} linked)
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {chainPreview.slice(0, 6).map((r) => (
              <span key={r._rowIndex} className="text-[10px] bg-surface border border-border rounded px-1.5 py-0.5 text-ink2">{r.title.slice(0, 25)}</span>
            ))}
            {chainPreview.length > 6 && <span className="text-[10px] text-ink3">+{chainPreview.length - 6} more</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={addChain} className="text-xs font-medium text-brand hover:underline">Add all</button>
            <button onClick={() => { setChainPreview(null); setExpandEntry(null) }} className="text-xs text-ink3 hover:text-ink">Dismiss</button>
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1">
        {candidates.length === 0 && (
          <p className="text-sm text-ink3 text-center py-4">No entries match</p>
        )}
        {candidates.map((row) => {
          const sel = selected.get(row._rowIndex)
          const isSelected = !!sel
          return (
            <div
              key={row._rowIndex}
              className={cn(
                'rounded-xl border transition-colors',
                isSelected
                  ? 'border-brand/30 bg-brand/5'
                  : 'border-border bg-surface hover:bg-hover',
              )}
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(row)}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                    isSelected ? 'bg-brand border-brand' : 'border-border bg-surface2',
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </button>

                {/* Entry info */}
                <div className="flex-1 min-w-0" onClick={() => toggleSelect(row)}>
                  <p className="text-sm font-medium text-ink truncate">{row.title}</p>
                  {row.category && <p className="text-[11px] text-ink3">{row.category}</p>}
                </div>

                {/* Chain expand */}
                {row.links && (
                  <button
                    onClick={() => showChain(row)}
                    className="text-[10px] text-brand hover:underline shrink-0 whitespace-nowrap"
                    title="Preview linked chain"
                  >
                    chain
                  </button>
                )}
              </div>

              {/* Type selector when selected */}
              {isSelected && (
                <div className="px-3 pb-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-ink3">as:</span>
                  <div className="relative">
                    <select
                      value={sel.type}
                      onChange={(e) => setLinkType(row._rowIndex, e.target.value as LinkType)}
                      className="appearance-none text-[11px] font-medium text-brand bg-brand/8 border border-brand/20 rounded-lg pl-2 pr-5 py-0.5 focus:outline-none cursor-pointer"
                    >
                      {LINK_TYPES.map(([t, label]) => (
                        <option key={t} value={t}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-brand pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between">
        <span className="text-xs text-ink3">
          {selectedArr.length > 0 ? `${selectedArr.length} selected` : 'Select entries to link'}
        </span>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-ink2 border border-border rounded-lg hover:bg-hover">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedArr)}
            disabled={selectedArr.length === 0}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
              selectedArr.length > 0
                ? 'bg-brand text-white hover:opacity-90'
                : 'bg-surface2 text-ink3 cursor-not-allowed',
            )}
          >
            Add {selectedArr.length > 0 ? `${selectedArr.length} link${selectedArr.length !== 1 ? 's' : ''}` : 'links'}
          </button>
        </div>
      </div>
    </div>
  )
}
