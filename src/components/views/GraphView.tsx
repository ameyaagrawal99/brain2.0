/**
 * GraphView — SVG force-directed knowledge graph.
 *
 * Edges come from three sources (in order of visual prominence):
 *   1. Explicit [[Title]] wiki-links in the `links` field   → solid, brand-colored
 *   2. [[Title]] mentions anywhere in original/rewritten/actionItems → dashed
 *   3. Same-category grouping (when "Show category clusters" toggled) → very faint
 *
 * Nodes
 *   • All rows are shown.  Connected ones are placed by the force simulation;
 *     orphan nodes are arranged in a loose grid in the bottom-left corner.
 *   • Color comes from the `categoryColors` store (or a deterministic fallback).
 *   • Click → opens DetailModal.  Hover → shows tooltip.
 *
 * Pan / zoom
 *   • Drag SVG background to pan.
 *   • Scroll / pinch to zoom (clamped 0.2–3×).
 *   • "Reset" button restores default transform.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import { Network, ZoomIn, ZoomOut, Maximize2, Eye, EyeOff } from 'lucide-react'
import type { BrainRow } from '@/types/sheet'

/* ── Types ─────────────────────────────────────────────────────────────── */

interface SimNode {
  id:  number   // _rowIndex
  x:   number
  y:   number
  vx:  number
  vy:  number
  row: BrainRow
}

interface GraphEdge {
  source: number  // _rowIndex
  target: number  // _rowIndex
  kind:   'explicit' | 'mention'
}

/* ── Link extraction ────────────────────────────────────────────────────── */

const WIKI_RE = /\[\[([^\]]+)\]\]/g

function extractWikiTitles(text: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(WIKI_RE.source, 'g')
  while ((m = re.exec(text)) !== null) out.push(m[1].trim().toLowerCase())
  return out
}

function buildEdges(rows: BrainRow[]): GraphEdge[] {
  const titleMap = new Map<string, number>()
  rows.forEach((r) => {
    if (r.title?.trim()) titleMap.set(r.title.toLowerCase().trim(), r._rowIndex)
  })

  const seen = new Set<string>()
  const edges: GraphEdge[] = []

  function addEdge(src: number, tgt: number, kind: GraphEdge['kind']) {
    if (src === tgt) return
    const key = src < tgt ? `${src}-${tgt}` : `${tgt}-${src}`
    // 'explicit' wins over 'mention'
    if (kind === 'explicit' || !seen.has(key)) {
      seen.add(key)
      edges.push({ source: src, target: tgt, kind })
    }
  }

  rows.forEach((row) => {
    // Explicit: [[Title]] in the dedicated links field
    extractWikiTitles(row.links || '').forEach((t) => {
      const tgt = titleMap.get(t)
      if (tgt !== undefined) addEdge(row._rowIndex, tgt, 'explicit')
    })
    // Mention: [[Title]] anywhere in text content
    const textTitles = extractWikiTitles(
      [row.original, row.rewritten, row.actionItems].join('\n')
    )
    textTitles.forEach((t) => {
      const tgt = titleMap.get(t)
      if (tgt !== undefined) addEdge(row._rowIndex, tgt, 'mention')
    })
  })

  return edges
}

/* ── Natural-language implicit mentions ────────────────────────────────── */

function buildImplicitEdges(rows: BrainRow[], existingEdges: GraphEdge[]): GraphEdge[] {
  const existingKeys = new Set(
    existingEdges.map((e) =>
      e.source < e.target ? `${e.source}-${e.target}` : `${e.target}-${e.source}`
    )
  )
  const implied: GraphEdge[] = []
  const seen = new Set<string>()

  rows.forEach((row) => {
    const bodyText = [row.original, row.rewritten, row.actionItems, row.links]
      .join('\n')
      .toLowerCase()

    rows.forEach((other) => {
      if (other._rowIndex === row._rowIndex) return
      const title = other.title?.toLowerCase().trim()
      if (!title || title.length < 6) return

      const src = row._rowIndex
      const tgt = other._rowIndex
      const key = src < tgt ? `${src}-${tgt}` : `${tgt}-${src}`
      if (existingKeys.has(key) || seen.has(key)) return

      // Must appear as a whole word (not just substring)
      const wordRe = new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (wordRe.test(bodyText)) {
        seen.add(key)
        implied.push({ source: src, target: tgt, kind: 'mention' })
      }
    })
  })

  return implied
}

/* ── Force simulation ───────────────────────────────────────────────────── */

const SIM_W = 1400
const SIM_H = 900

function runSimulation(nodes: SimNode[], edges: GraphEdge[], iters = 160): SimNode[] {
  const n   = nodes.length
  const CX  = SIM_W / 2
  const CY  = SIM_H / 2

  const idxById = new Map(nodes.map((nd, i) => [nd.id, i]))

  const REPEL   = 4000
  const SPRING  = 0.04
  const IDEAL   = 140
  const FRICTION = 0.82
  const GRAVITY  = 0.018

  const fx = new Float64Array(n)
  const fy = new Float64Array(n)

  for (let iter = 0; iter < iters; iter++) {
    fx.fill(0); fy.fill(0)

    // Repulsion O(n²) — fine for n ≤ 120
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx  = nodes[i].x - nodes[j].x
        const dy  = nodes[i].y - nodes[j].y
        const d2  = dx * dx + dy * dy + 1
        const d   = Math.sqrt(d2)
        const f   = REPEL / d2
        const nx  = dx / d
        const ny  = dy / d
        fx[i] += f * nx; fy[i] += f * ny
        fx[j] -= f * nx; fy[j] -= f * ny
      }
    }

    // Spring attraction
    for (const e of edges) {
      const si = idxById.get(e.source)
      const ti = idxById.get(e.target)
      if (si === undefined || ti === undefined) continue
      const dx   = nodes[ti].x - nodes[si].x
      const dy   = nodes[ti].y - nodes[si].y
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1
      const f    = SPRING * (dist - IDEAL)
      const nx   = dx / dist
      const ny   = dy / dist
      fx[si] += f * nx; fy[si] += f * ny
      fx[ti] -= f * nx; fy[ti] -= f * ny
    }

    // Gravity to center
    for (let i = 0; i < n; i++) {
      fx[i] += (CX - nodes[i].x) * GRAVITY
      fy[i] += (CY - nodes[i].y) * GRAVITY
    }

    // Integrate
    for (let i = 0; i < n; i++) {
      nodes[i].vx = (nodes[i].vx + fx[i]) * FRICTION
      nodes[i].vy = (nodes[i].vy + fy[i]) * FRICTION
      nodes[i].x  = Math.max(30, Math.min(SIM_W - 30, nodes[i].x + nodes[i].vx))
      nodes[i].y  = Math.max(30, Math.min(SIM_H - 30, nodes[i].y + nodes[i].vy))
    }
  }

  return nodes
}

/* ── Category colour helpers ─────────────────────────────────────────────── */

const PALETTE = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#3b82f6','#84cc16',
]

function catColor(cat: string, overrides: Record<string, string>): string {
  if (!cat) return '#94a3b8'
  if (overrides[cat]) return overrides[cat]
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff
  return PALETTE[h % PALETTE.length]
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function GraphView() {
  const rows           = useBrainStore((s) => s.rows)
  const openModal      = useBrainStore((s) => s.openModal)
  const categoryColors = useBrainStore((s) => s.categoryColors)

  const svgRef         = useRef<SVGSVGElement>(null)
  const [transform,    setTransform]    = useState({ x: 0, y: 0, scale: 1 })
  const [hoveredId,    setHoveredId]    = useState<number | null>(null)
  const [showImplicit, setShowImplicit] = useState(false)
  const [showOrphans,  setShowOrphans]  = useState(true)
  const dragging = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)

  // Build edges from wiki links
  const explicitEdges = useMemo(() => buildEdges(rows), [rows])

  const implicitEdges = useMemo(
    () => (showImplicit ? buildImplicitEdges(rows, explicitEdges) : []),
    [rows, explicitEdges, showImplicit]
  )

  const allEdges = useMemo(
    () => [...explicitEdges, ...implicitEdges],
    [explicitEdges, implicitEdges]
  )

  // Determine connected node IDs
  const connectedIds = useMemo(() => {
    const ids = new Set<number>()
    allEdges.forEach((e) => { ids.add(e.source); ids.add(e.target) })
    return ids
  }, [allEdges])

  // Cap at 120 nodes for performance; prefer connected ones
  const connectedRows = useMemo(
    () => rows.filter((r) => connectedIds.has(r._rowIndex)).slice(0, 120),
    [rows, connectedIds]
  )
  const orphanRows = useMemo(
    () => rows.filter((r) => !connectedIds.has(r._rowIndex)),
    [rows, connectedIds]
  )

  // Compute initial positions (circle)
  const initNodes = useMemo((): SimNode[] => {
    const n  = connectedRows.length
    const CX = SIM_W / 2
    const CY = SIM_H / 2
    const R  = Math.min(300, 60 + n * 8)
    return connectedRows.map((row, i) => ({
      id:  row._rowIndex,
      x:   CX + R * Math.cos((2 * Math.PI * i) / n),
      y:   CY + R * Math.sin((2 * Math.PI * i) / n),
      vx:  0,
      vy:  0,
      row,
    }))
  }, [connectedRows])

  // Run force simulation (re-runs when rows or edges change)
  const simNodes = useMemo(() => {
    if (initNodes.length === 0) return []
    // Deep-copy to avoid mutating the memo input
    const cloned = initNodes.map((n) => ({ ...n }))
    return runSimulation(cloned, allEdges)
  }, [initNodes, allEdges])

  // Place orphan nodes in a loose grid in the corner
  const orphanNodes = useMemo((): SimNode[] => {
    if (!showOrphans) return []
    const COLS = 8
    const SPACING = 80
    const START_X = 60
    const START_Y = SIM_H - 60 - Math.ceil(orphanRows.length / COLS) * SPACING
    return orphanRows.map((row, i) => ({
      id:  row._rowIndex,
      x:   START_X + (i % COLS) * SPACING,
      y:   START_Y + Math.floor(i / COLS) * SPACING,
      vx:  0,
      vy:  0,
      row,
    }))
  }, [orphanRows, showOrphans])

  const allNodes = useMemo(() => [...simNodes, ...orphanNodes], [simNodes, orphanNodes])
  const nodeById = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes])

  /* ── Pan / zoom ── */

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setTransform((t) => {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const next  = Math.max(0.2, Math.min(3, t.scale * delta))
      return { ...t, scale: next }
    })
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === 'circle') return
    dragging.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y }
  }, [transform])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    setTransform((t) => ({
      ...t,
      x: dragging.current!.tx + e.clientX - dragging.current!.startX,
      y: dragging.current!.ty + e.clientY - dragging.current!.startY,
    }))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = null }, [])

  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 })

  /* ── Tooltip ── */

  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: SimNode } | null>(null)

  function handleNodeEnter(e: React.MouseEvent, node: SimNode) {
    setHoveredId(node.id)
    setTooltip({ x: e.clientX, y: e.clientY, node })
  }

  function handleNodeLeave() {
    setHoveredId(null)
    setTooltip(null)
  }

  /* ── Key edges for hovered node ── */

  const hoveredEdges = useMemo(() => {
    if (hoveredId === null) return new Set<string>()
    const s = new Set<string>()
    allEdges.forEach((e) => {
      if (e.source === hoveredId || e.target === hoveredId) {
        const key = e.source < e.target ? `${e.source}-${e.target}` : `${e.target}-${e.source}`
        s.add(key)
      }
    })
    return s
  }, [hoveredId, allEdges])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-ink3">
        <Network className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">No entries yet</p>
      </div>
    )
  }

  const noLinks = explicitEdges.length === 0

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>

      {/* ── Controls ── */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">

        {/* Stats badge */}
        <div className="bg-surface/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs text-ink2 shadow">
          <span className="font-semibold text-ink">{connectedRows.length}</span> linked
          {showOrphans && orphanRows.length > 0 && (
            <> · <span className="font-semibold text-ink">{orphanRows.length}</span> unlinked</>
          )}
          {' · '}
          <span className="font-semibold text-brand">{explicitEdges.length}</span> edge{explicitEdges.length !== 1 ? 's' : ''}
        </div>

        {/* Toggle buttons */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setShowImplicit((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm',
              showImplicit
                ? 'bg-brand text-white border-brand'
                : 'bg-surface/90 border-border text-ink2 hover:text-ink backdrop-blur-sm',
            )}
            title="Show text mentions (implied links)"
          >
            {showImplicit ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Implicit links
          </button>
          <button
            onClick={() => setShowOrphans((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm',
              showOrphans
                ? 'bg-surface/90 border-brand/40 text-brand backdrop-blur-sm'
                : 'bg-surface/90 border-border text-ink3 hover:text-ink backdrop-blur-sm',
            )}
          >
            {showOrphans ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Unlinked nodes
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setTransform((t) => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))}
            className="w-7 h-7 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-border rounded-lg text-ink2 hover:text-ink shadow-sm"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.2, t.scale * 0.8) }))}
            className="w-7 h-7 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-border rounded-lg text-ink2 hover:text-ink shadow-sm"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetTransform}
            className="w-7 h-7 flex items-center justify-center bg-surface/90 backdrop-blur-sm border border-border rounded-lg text-ink2 hover:text-ink shadow-sm"
            title="Reset view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="absolute top-3 right-3 z-20 bg-surface/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow text-[11px] text-ink2 space-y-1">
        <div className="flex items-center gap-2">
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--brand)" strokeWidth="2" /></svg>
          <span>Explicit link</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="4">
            <line x1="0" y1="2" x2="24" y2="2" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span>Text mention</span>
        </div>
        <div className="mt-1 pt-1 border-t border-border text-ink3">
          Drag to pan · Scroll to zoom
        </div>
      </div>

      {/* ── Empty-state hint ── */}
      {noLinks && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-surface/95 border border-border rounded-2xl p-6 max-w-xs text-center shadow-xl">
            <Network className="w-8 h-8 text-brand/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink mb-1">No links yet</p>
            <p className="text-xs text-ink3 leading-relaxed">
              Open any entry, click <strong>Find related</strong> in the AI bar, then use the{' '}
              <strong>Link</strong> button — or type <code className="bg-surface2 px-1 rounded">[[</code>{' '}
              in any text field to manually link entries.
            </p>
            {implicitEdges.length === 0 && (
              <button
                onClick={() => setShowImplicit(true)}
                className="pointer-events-auto mt-3 text-xs text-brand hover:underline"
              >
                Show implicit text mentions →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SVG canvas ── */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        viewBox={`0 0 ${SIM_W} ${SIM_H}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ background: 'var(--color-bg)' }}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>

          {/* ── Edges ── */}
          {allEdges.map((edge) => {
            const s = nodeById.get(edge.source)
            const t = nodeById.get(edge.target)
            if (!s || !t) return null
            const key = `${edge.source}-${edge.target}`
            const edgeKey = edge.source < edge.target ? key : `${edge.target}-${edge.source}`
            const isHovered = hoveredEdges.has(edgeKey)
            const isExplicit = edge.kind === 'explicit'
            return (
              <line
                key={`e-${key}`}
                x1={s.x} y1={s.y}
                x2={t.x} y2={t.y}
                stroke={isExplicit ? 'var(--brand)' : '#94a3b8'}
                strokeWidth={isHovered ? 2.5 : (isExplicit ? 1.5 : 1)}
                strokeDasharray={isExplicit ? undefined : '5 4'}
                strokeOpacity={hoveredId !== null ? (isHovered ? 1 : 0.2) : (isExplicit ? 0.7 : 0.35)}
                style={{ transition: 'stroke-opacity 0.15s' }}
              />
            )
          })}

          {/* ── Nodes ── */}
          {allNodes.map((node) => {
            const color      = catColor(node.row.category, categoryColors)
            const isHovered  = hoveredId === node.id
            const isRelated  = hoveredId !== null && hoveredEdges.size > 0 && (() => {
              const k1 = hoveredId < node.id ? `${hoveredId}-${node.id}` : `${node.id}-${hoveredId}`
              return hoveredEdges.has(k1)
            })()
            const dimmed     = hoveredId !== null && !isHovered && !isRelated
            const isOrphan   = !connectedIds.has(node.id)
            const r          = isHovered ? 12 : (isOrphan ? 7 : 9)

            return (
              <g
                key={`n-${node.id}`}
                transform={`translate(${node.x},${node.y})`}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.15s' }}
                onClick={() => openModal(node.row)}
                onMouseEnter={(e) => handleNodeEnter(e, node)}
                onMouseLeave={handleNodeLeave}
              >
                {/* Halo on hover */}
                {isHovered && (
                  <circle r={r + 6} fill={color} fillOpacity={0.15} />
                )}
                {/* Node circle */}
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={isOrphan ? 0.4 : 0.85}
                  stroke={isHovered ? color : 'var(--color-surface)'}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                {/* Label */}
                <text
                  y={r + 11}
                  textAnchor="middle"
                  fontSize={isHovered ? 11 : 9}
                  fill="var(--color-ink2)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {(node.row.title || 'Untitled').slice(0, 22)}
                  {(node.row.title || '').length > 22 ? '…' : ''}
                </text>
              </g>
            )
          })}

          {/* Orphan cluster label */}
          {showOrphans && orphanNodes.length > 0 && (
            <text
              x={60}
              y={SIM_H - orphanNodes.length > 0
                ? Math.max(60, orphanNodes[0].y - 24)
                : SIM_H - 20}
              fontSize={10}
              fill="var(--color-ink3)"
              style={{ userSelect: 'none' }}
            >
              Unlinked ({orphanRows.length})
            </text>
          )}
        </g>
      </svg>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl px-3 py-2 max-w-[240px]">
            <p className="text-sm font-semibold text-ink truncate">{tooltip.node.row.title || 'Untitled'}</p>
            {tooltip.node.row.category && (
              <p className="text-[11px] text-brand mt-0.5">{tooltip.node.row.category}</p>
            )}
            {(tooltip.node.row.rewritten || tooltip.node.row.original) && (
              <p className="text-[11px] text-ink3 mt-1 line-clamp-2 leading-relaxed">
                {(tooltip.node.row.rewritten || tooltip.node.row.original || '').slice(0, 120)}
              </p>
            )}
            <p className="text-[10px] text-ink3 mt-1.5 italic">Click to open</p>
          </div>
        </div>
      )}
    </div>
  )
}
