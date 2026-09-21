import { useEffect, useRef, useState } from 'react'
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday as isTodayFn, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseIso(value: string): Date | null {
  if (!value) return null
  const d = new Date(value + 'T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

function toIso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function MilestoneCalendarPicker({
  value, onChange, markedDates = [], autoFocus,
}: {
  value: string
  onChange: (iso: string) => void
  markedDates?: string[]
  autoFocus?: boolean
}) {
  const selected = parseIso(value)
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) setViewMonth(selected)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const gridStart = startOfWeek(startOfMonth(viewMonth))
  const gridEnd   = endOfWeek(endOfMonth(viewMonth))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const markedSet = new Set(markedDates)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        autoFocus={autoFocus}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-surface2 border border-border rounded-full px-4 py-2.5 text-sm font-medium text-ink hover:bg-hover transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-ink3 shrink-0" />
          <span className="truncate">{selected ? format(selected, 'd MMM yyyy') : 'Pick a date'}</span>
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-ink3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-2xl shadow-xl p-3 animate-scaleIn">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-hover text-ink2 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-ink">{format(viewMonth, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-hover text-ink2 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[10px] font-semibold text-ink3 uppercase text-center py-1">{w}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((d) => {
              const iso = toIso(d)
              const inMonth  = isSameMonth(d, viewMonth)
              const isSel    = selected ? isSameDay(d, selected) : false
              const isToday  = isTodayFn(d)
              const hasOther = markedSet.has(iso) && !isSel
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false) }}
                  className={cn(
                    'relative w-9 h-9 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-colors',
                    !inMonth && 'text-ink3/50',
                    inMonth && !isSel && 'text-ink hover:bg-hover',
                    isSel && 'bg-brand text-white font-semibold',
                    !isSel && isToday && 'ring-1 ring-brand/50',
                  )}
                >
                  {format(d, 'd')}
                  {hasOther && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand/60" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Direct typing fallback */}
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
            <input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 min-w-0 bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button
              type="button"
              onClick={() => { onChange(toIso(new Date())); setOpen(false) }}
              className="shrink-0 text-xs font-medium text-brand hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
