import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, X, ChevronRight } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import type { BrainRow } from '@/types/sheet'

/* ── Constants ───────────────────────────────────────────────────────── */
const PALETTE = [
  '#6366f1','#8b5cf6','#10b981','#f59e0b',
  '#3b82f6','#ef4444','#14b8a6','#d946ef',
  '#f97316','#06b6d4',
]

const CX = 500, CY = 340     // SVG canvas center
const CAT_R  = 188            // category ring radius
const NOTE_R = 360            // note ring radius
const MAX_NOTES_SHOWN = 8     // max notes visible per expanded category

/* ── Types ───────────────────────────────────────────────────────────── */
interface CatNode {
  name: string; count: number; color: string
  angle: number; x: number; y: number; rows: BrainRow[]
}
interface NoteNode {
  row: BrainRow; x: number; y: number
}

/* ── SVG helpers ─────────────────────────────────────────────────────── */
function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const bend = Math.min(len * 0.12, 24)
  const cx = mx - (dy / len) * bend
  const cy = my + (dx / len) * bend
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

function truncate(text: string, n: number) {
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

/* ── Main component ──────────────────────────────────────────────────── */
export function MindmapView() {
  const rows       = useBrainStore((s) => s.rows)
  const openModal  = useBrainStore((s) => s.openModal)
  const setViewMode = useBrainStore((s) => s.setViewMode)

  const [entered,      setEntered]      = useState(false)
  const [expandedCat,  setExpandedCat]  = useState<string | null>(null)
  const [noteEntered,  setNoteEntered]  = useState(false)
  const [search,       setSearch]       = useState('')

  /* Fade in on mount */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [])

  /* Animate notes flying out when a category is expanded */
  useEffect(() => {
    setNoteEntered(false)
    if (!expandedCat) return
    const t = setTimeout(() => setNoteEntered(true), 30)
    return () => clearTimeout(t)
  }, [expandedCat])

  /* ── Category nodes ─────────────────────────────────────────────── */
  const catNodes = useMemo<CatNode[]>(() => {
    const map: Record<string, BrainRow[]> = {}
    for (const row of rows) {
      const cat = row.category?.trim() || 'Uncategorized'
      if (!map[cat]) map[cat] = []
      map[cat].push(row)
    }
    const entries = Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)

    return entries.map(([name, catRows], i) => {
      const angle = (2 * Math.PI * i / entries.length) - Math.PI / 2
      return {
        name, count: catRows.length, color: PALETTE[i % PALETTE.length],
        angle,
        x: CX + CAT_R * Math.cos(angle),
        y: CY + CAT_R * Math.sin(angle),
        rows: catRows,
      }
    })
  }, [rows])

  /* ── Note nodes for expanded category ──────────────────────────── */
  const noteNodes = useMemo<NoteNode[]>(() => {
    const cat = catNodes.find((c) => c.name === expandedCat)
    if (!cat) return []

    const filtered = search
      ? cat.rows.filter((r) => {
          const q = search.toLowerCase()
          return (r.title || '').toLowerCase().includes(q) ||
                 (r.original || '').toLowerCase().includes(q)
        })
      : cat.rows

    const visible = filtered.slice(0, MAX_NOTES_SHOWN)
    const n = visible.length
    const spread = Math.max(0.4, Math.min(Math.PI * 0.75, n * 0.32))

    return visible.map((row, j) => {
      const offset = n > 1 ? spread * (j / (n - 1) - 0.5) : 0
      const angle  = cat.angle + offset
      return {
        row,
        x: CX + NOTE_R * Math.cos(angle),
        y: CY + NOTE_R * Math.sin(angle),
      }
    })
  }, [catNodes, expandedCat, search])

  const activeCat = catNodes.find((c) => c.name === expandedCat) ?? null
  const extraNotes = activeCat ? Math.max(0, activeCat.count - MAX_NOTES_SHOWN) : 0

  return (
    <div
      className="flex flex-col bg-white overflow-hidden"
      style={{
        height: 'calc(100vh - 52px)',
        opacity: entered ? 1 : 0,
        transition: 'opacity 0.45s ease',
      }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setViewMode('card')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cards
        </button>

        <div className="flex items-center gap-2">
          {activeCat && (
            <span
              className="flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold text-white"
              style={{ background: activeCat.color }}
            >
              {activeCat.name}
              <button onClick={() => setExpandedCat(null)} className="opacity-70 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={expandedCat ? 'Filter notes…' : 'Open a category first…'}
              disabled={!expandedCat}
              className="h-7 pl-7 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg
                focus:outline-none focus:border-indigo-400 disabled:opacity-40 w-40 sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* ── SVG Canvas ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 680"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
        >
          <defs>
            <radialGradient id="mm-center-grad" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </radialGradient>
            <filter id="mm-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Center → Category edges ─────────────────────── */}
          {catNodes.map((cat) => {
            const dimmed = expandedCat !== null && expandedCat !== cat.name
            return (
              <path
                key={`edge-c-${cat.name}`}
                d={curvePath(CX, CY, cat.x, cat.y)}
                stroke={cat.color}
                strokeWidth={expandedCat === cat.name ? 2.5 : 1.5}
                strokeOpacity={entered ? (dimmed ? 0.12 : 0.45) : 0}
                fill="none"
                style={{ transition: 'stroke-opacity 0.5s, stroke-width 0.3s' }}
              />
            )
          })}

          {/* ── Category → Note edges ──────────────────────── */}
          {activeCat && noteNodes.map((note, i) => (
            <path
              key={`edge-n-${note.row._rowIndex}`}
              d={curvePath(activeCat.x, activeCat.y, note.x, note.y)}
              stroke={activeCat.color}
              strokeWidth={1.2}
              strokeOpacity={noteEntered ? 0.3 : 0}
              fill="none"
              style={{ transition: `stroke-opacity 0.35s ${i * 25}ms` }}
            />
          ))}

          {/* ── Category nodes ─────────────────────────────── */}
          {catNodes.map((cat, i) => {
            const isActive = expandedCat === cat.name
            const isDimmed = expandedCat !== null && !isActive
            const r = isActive ? 44 : 36

            return (
              <g
                key={`cat-${cat.name}`}
                onClick={() => setExpandedCat(isActive ? null : cat.name)}
                style={{
                  transform: entered
                    ? `translate(${cat.x}px, ${cat.y}px)`
                    : `translate(${CX}px, ${CY}px)`,
                  opacity: entered ? (isDimmed ? 0.25 : 1) : 0,
                  transition: [
                    `transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 50}ms`,
                    `opacity 0.45s ease ${i * 50}ms`,
                  ].join(', '),
                  cursor: 'pointer',
                }}
              >
                {/* Shadow ring */}
                <circle r={r + 6} fill={cat.color} fillOpacity={isActive ? 0.12 : 0} style={{ transition: 'r 0.35s, fill-opacity 0.35s' }} />

                {/* Main circle */}
                <circle
                  r={r}
                  fill={isActive ? cat.color : 'white'}
                  stroke={cat.color}
                  strokeWidth={isActive ? 0 : 2.5}
                  filter={isActive ? 'url(#mm-glow)' : undefined}
                  style={{ transition: 'r 0.35s, fill 0.3s' }}
                />

                {/* Count badge (hidden when active) */}
                {!isActive && (
                  <>
                    <circle cx={26} cy={-26} r={11} fill={cat.color} />
                    <text x={26} y={-26} textAnchor="middle" dominantBaseline="central"
                      fontSize={8.5} fontWeight="bold" fill="white" style={{ userSelect: 'none' }}>
                      {cat.count > 999 ? '999+' : cat.count}
                    </text>
                  </>
                )}

                {/* Label */}
                <text
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={isActive ? 11.5 : 10}
                  fontWeight={isActive ? 700 : 600}
                  fill={isActive ? 'white' : cat.color}
                  style={{ userSelect: 'none', transition: 'fill 0.3s, font-size 0.3s' }}
                >
                  {truncate(cat.name, 13)}
                </text>

                {/* Arrow indicator */}
                {!isActive && (
                  <g transform={`translate(${Math.cos(cat.angle) * (r + 14)}, ${Math.sin(cat.angle) * (r + 14)})`}>
                    <ChevronRight
                      className="text-current"
                      style={{
                        width: 10, height: 10,
                        transform: `rotate(${cat.angle * 180 / Math.PI}deg)`,
                        color: cat.color, opacity: 0.5,
                      }}
                    />
                  </g>
                )}
              </g>
            )
          })}

          {/* ── Note nodes ─────────────────────────────────── */}
          {activeCat && noteNodes.map((note, i) => {
            const title = note.row.title || '(no title)'
            return (
              <g
                key={`note-${note.row._rowIndex}`}
                onClick={() => openModal(note.row)}
                style={{
                  transform: noteEntered
                    ? `translate(${note.x}px, ${note.y}px)`
                    : `translate(${activeCat.x}px, ${activeCat.y}px)`,
                  opacity: noteEntered ? 1 : 0,
                  transition: [
                    `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms`,
                    `opacity 0.35s ease ${i * 30}ms`,
                  ].join(', '),
                  cursor: 'pointer',
                }}
              >
                {/* Card */}
                <rect x={-68} y={-24} width={136} height={48} rx={10}
                  fill="white" stroke={activeCat.color} strokeWidth={1.8} />
                <rect x={-68} y={-24} width={5} height={48} rx={3}
                  fill={activeCat.color} />

                {/* Title */}
                <text x={-56} textAnchor="start" y={-6}
                  fontSize={9.5} fontWeight={600} fill="#1e293b"
                  style={{ userSelect: 'none' }}>
                  {truncate(title, 20)}
                </text>

                {/* Sub-label: taskStatus or category */}
                <text x={-56} textAnchor="start" y={10}
                  fontSize={8} fill={activeCat.color}
                  style={{ userSelect: 'none' }}>
                  {truncate(note.row.taskStatus || note.row.subCategory || '', 22)}
                </text>

                {/* Hover indicator */}
                <rect x={-68} y={-24} width={136} height={48} rx={10}
                  fill="transparent" stroke="transparent" strokeWidth={0}
                  className="hover:fill-indigo-50 transition-colors"
                  style={{ cursor: 'pointer' }}
                />
              </g>
            )
          })}

          {/* ── "X more" indicator ─────────────────────────── */}
          {activeCat && extraNotes > 0 && (() => {
            const lastNote = noteNodes[noteNodes.length - 1]
            if (!lastNote) return null
            const ang = activeCat.angle + Math.PI * 0.42
            const mx = CX + (NOTE_R + 48) * Math.cos(ang)
            const my = CY + (NOTE_R + 48) * Math.sin(ang)
            return (
              <g style={{ transform: `translate(${mx}px, ${my}px)`, opacity: noteEntered ? 0.7 : 0, transition: 'opacity 0.4s 0.3s' }}>
                <circle r={22} fill={activeCat.color} fillOpacity={0.12} stroke={activeCat.color} strokeWidth={1.5} strokeDasharray="4 2" />
                <text textAnchor="middle" y={-3} fontSize={10} fontWeight={700} fill={activeCat.color} style={{ userSelect: 'none' }}>
                  +{extraNotes}
                </text>
                <text textAnchor="middle" y={10} fontSize={7.5} fill={activeCat.color} style={{ userSelect: 'none' }}>
                  more
                </text>
              </g>
            )
          })()}

          {/* ── Centre node ────────────────────────────────── */}
          <g style={{ transform: `translate(${CX}px, ${CY}px)`, opacity: entered ? 1 : 0, transition: 'opacity 0.5s 0.1s' }}>
            <circle r={56} fill="url(#mm-center-grad)" filter="url(#mm-glow)" />
            <circle r={56} fill="none" stroke="white" strokeWidth={2} strokeOpacity={0.25} />
            <text textAnchor="middle" y={-7} fontSize={14} fontWeight={800} fill="white" style={{ userSelect: 'none' }}>
              Brain 2.0
            </text>
            <text textAnchor="middle" y={11} fontSize={9} fill="white" fillOpacity={0.75} style={{ userSelect: 'none' }}>
              {rows.length.toLocaleString()} notes
            </text>
          </g>
        </svg>
      </div>

      {/* ── Bottom hint ─────────────────────────────────────────── */}
      <div className="shrink-0 text-center py-2.5 text-xs text-gray-400 border-t border-gray-50">
        {!expandedCat
          ? 'Click a category bubble to explore its notes'
          : activeCat
            ? <>
                Showing {noteNodes.length} of {activeCat.count} · {extraNotes > 0 && `${extraNotes} more with search ·`} click a card to open it
              </>
            : null
        }
      </div>
    </div>
  )
}
