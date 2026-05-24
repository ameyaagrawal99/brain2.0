/**
 * GraphView — SVG force-directed knowledge graph.
 *
 * Edges come from three sources (in order of visual prominence):
 *   1. Explicit [[Title]] wiki-links in the `links` field   → solid, typed-colour
 *   2. [[Title]] mentions anywhere in original/rewritten/actionItems → dashed
 *   3. Same-category grouping (when "Show category clusters" toggled) → very faint
 *
 * Nodes
 *   • All rows are shown.  Connected ones are placed by the force simulation;
 *     orphan nodes are arranged in a loose grid in the bottom-left corner.
 *   • Color comes from the `categoryColors` store (or a deterministic fallback).
 *   • Click → opens DetailModal.  Hover → shows tooltip.  Right-click → context menu.
 *
 * Pan / zoom
 *   • Drag SVG background to pan.
 *   • Scroll / pinch to zoom (clamped 0.2–3×).
 *   • "Reset" button restores default transform.
 *
 * Visual enhancements
 *   • Typed-edge colours + legend.
 *   • Category cluster convex-hull backgrounds (toggleable).
 *   • Collapsible filter panel (link types + categories).
 *   • Mini-map (160×100) in bottom-right corner.
 *   • Right-click context menu: Open / Focus / Pin / Expand neighbours / Add link.
 *   • Enhanced tooltip with category badge + edge-type badges + Open button.
 *   • Performance cap: graphs > 300 nodes → fewer sim ticks, static orphan grid.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import {
  Network, ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, Target,
  Filter, ChevronDown, ChevronRight, Pin, PinOff, ExternalLink, UserSearch,
} from 'lucide-react'
import type { BrainRow, LinkType } from '@/types/sheet'
import { LINK_TYPE_COLORS, LINK_TYPE_LABELS } from '@/types/sheet'
import { extractWikiLinks, extractTypedLinks, formatLink } from '@/lib/linkGraph'
import { LinkPicker } from '@/components/ui/LinkPicker'

/* ── Types ─────────────────────────────────────────────────────────────── */

interface SimNode {
  id:     number   // _rowIndex
  x:      number
  y:      number
  vx:     number
  vy:     number
  row:    BrainRow
  pinned: boolean
}

interface GraphEdge {
  source:   number  // _rowIndex
  target:   number  // _rowIndex
  kind:     'explicit' | 'mention'
  linkType: LinkType  // relationship type (untyped for mention edges)
}

/* ── Edge building ──────────────────────────────────────────────────────── */

function buildEdges(rows: BrainRow[]): GraphEdge[] {
  const titleMap = new Map<string, number>()
  rows.forEach((r) => {
    if (r.title?.trim()) titleMap.set(r.title.toLowerCase().trim(), r._rowIndex)
  })

  const seen = new Map<string, LinkType>()
  const edges: GraphEdge[] = []

  function addEdge(src: number, tgt: number, kind: GraphEdge['kind'], linkType: LinkType) {
    if (src === tgt) return
    const key = src < tgt ? `${src}-${tgt}` : `${tgt}-${src}`
    // 'explicit' wins over 'mention'; explicit with a type wins over untyped explicit
    if (kind === 'explicit' || !seen.has(key)) {
      seen.set(key, linkType)
      edges.push({ source: src, target: tgt, kind, linkType })
    }
  }

  rows.forEach((row) => {
    // Explicit typed links from the dedicated links field ([[Title|type]] or [[Title]])
    extractTypedLinks(row.links || '').forEach((link) => {
      const tgt = titleMap.get(link.title.toLowerCase().trim())
      if (tgt !== undefined) addEdge(row._rowIndex, tgt, 'explicit', link.type)
    })
    // Mention: [[Title]] anywhere in body text (typed if available, else untyped)
    extractTypedLinks([row.original, row.rewritten, row.actionItems].join('\n')).forEach((link) => {
      const tgt = titleMap.get(link.title.toLowerCase().trim())
      if (tgt !== undefined) addEdge(row._rowIndex, tgt, 'mention', link.type)
    })
  })

  return edges
}

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

      const wordRe = new RegExp(`\\b${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (wordRe.test(bodyText)) {
        seen.add(key)
        implied.push({ source: src, target: tgt, kind: 'mention', linkType: 'untyped' })
      }
    })
  })

  return implied
}

/* ── Convex hull (Graham scan) ──────────────────────────────────────────── */

function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points
  const pts = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y)
  const cross = (O: { x: number; y: number }, A: { x: number; y: number }, B: { x: number; y: number }) =>
    (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x)

  const lower: typeof pts = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: typeof pts = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  lower.pop(); upper.pop()
  return [...lower, ...upper]
}

function padHull(hull: { x: number; y: number }[], pad: number): { x: number; y: number }[] {
  if (hull.length === 0) return hull
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  return hull.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad }
  })
}

/* ── Force simulation ───────────────────────────────────────────────────── */

const SIM_W = 1400
const SIM_H = 900

function runSimulation(nodes: SimNode[], edges: GraphEdge[], iters = 160): SimNode[] {
  const n   = nodes.length
  const CX  = SIM_W / 2
  const CY  = SIM_H / 2

  const idxById = new Map(nodes.map((nd, i) => [nd.id, i]))

  const REPEL    = 4000
  const SPRING   = 0.04
  const IDEAL    = 140
  const FRICTION = 0.82
  const GRAVITY  = 0.018

  const fx = new Float64Array(n)
  const fy = new Float64Array(n)

  for (let iter = 0; iter < iters; iter++) {
    fx.fill(0); fy.fill(0)

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

    for (let i = 0; i < n; i++) {
      fx[i] += (CX - nodes[i].x) * GRAVITY
      fy[i] += (CY - nodes[i].y) * GRAVITY
    }

    for (let i = 0; i < n; i++) {
      if (nodes[i].pinned) continue
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

/* ── Mini-map constants ─────────────────────────────────────────────────── */

const MM_W = 160
const MM_H = 100
const MM_SCALE_X = MM_W / SIM_W
const MM_SCALE_Y = MM_H / SIM_H

/* ── Component ──────────────────────────────────────────────────────────── */

export function GraphView() {
  const rows           = useBrainStore((s) => s.rows)
  const openModal      = useBrainStore((s) => s.openModal)
  const categoryColors = useBrainStore((s) => s.categoryColors)
  const updateRowLocally = useBrainStore((s) => s.updateRowLocally)

  const svgRef         = useRef<SVGSVGElement>(null)
  const [transform,    setTransform]    = useState({ x: 0, y: 0, scale: 1 })
  const [hoveredId,    setHoveredId]    = useState<number | null>(null)
  const [showImplicit, setShowImplicit] = useState(false)
  const [showOrphans,  setShowOrphans]  = useState(true)
  const [showClusters, setShowClusters] = useState(false)
  const [focusNodeId,  setFocusNodeId]  = useState<number | null>(null)
  const [contextMenu,  setContextMenu]  = useState<{ x: number; y: number; node: SimNode } | null>(null)
  const [pinnedIds,    setPinnedIds]    = useState<Set<number>>(new Set())
  const [linkPickerFor, setLinkPickerFor] = useState<SimNode | null>(null)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [hiddenLinkTypes, setHiddenLinkTypes] = useState<Set<LinkType>>(new Set())
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const [linkedOnly, setLinkedOnly] = useState(false)
  const [isolatedOnly, setIsolatedOnly] = useState(false)

  const dragging = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)
  const mmDragging = useRef(false)

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
  const linkedCount = connectedIds.size
  const unlinkedCount = Math.max(0, rows.length - linkedCount)

  // Performance cap: > 300 nodes → fewer sim ticks
  const totalNodes = rows.length
  const simIterations = totalNodes > 300 ? 60 : 160

  // Cap connected rows (prefer connected)
  const connectedRows = useMemo(
    () => rows.filter((r) => connectedIds.has(r._rowIndex)).slice(0, totalNodes > 300 ? 200 : 120),
    [rows, connectedIds, totalNodes]
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
      id:     row._rowIndex,
      x:      CX + R * Math.cos((2 * Math.PI * i) / n),
      y:      CY + R * Math.sin((2 * Math.PI * i) / n),
      vx:     0,
      vy:     0,
      row,
      pinned: pinnedIds.has(row._rowIndex),
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedRows])

  // Run force simulation (re-runs when rows or edges change)
  const simNodes = useMemo(() => {
    if (initNodes.length === 0) return []
    const cloned = initNodes.map((n) => ({ ...n, pinned: pinnedIds.has(n.id) }))
    return runSimulation(cloned, allEdges, simIterations)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initNodes, allEdges, simIterations])

  // Place orphan nodes in a grid
  const orphanNodes = useMemo((): SimNode[] => {
    if (!showOrphans) return []
    const COLS = totalNodes > 300 ? 12 : 8
    const SPACING = 80
    const START_X = 60
    const START_Y = SIM_H - 60 - Math.ceil(orphanRows.length / COLS) * SPACING
    return orphanRows.map((row, i) => ({
      id:     row._rowIndex,
      x:      START_X + (i % COLS) * SPACING,
      y:      START_Y + Math.floor(i / COLS) * SPACING,
      vx:     0,
      vy:     0,
      row,
      pinned: false,
    }))
  }, [orphanRows, showOrphans, totalNodes])

  const allNodes = useMemo(() => [...simNodes, ...orphanNodes], [simNodes, orphanNodes])
  const nodeById = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes])

  // All categories in the graph
  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    rows.forEach((r) => { if (r.category?.trim()) cats.add(r.category.trim()) })
    return [...cats].sort()
  }, [rows])

  // Focus cluster: only show the focused node and its direct neighbours
  const focusNeighbours = useMemo(() => {
    if (focusNodeId === null) return null
    const ids = new Set<number>([focusNodeId])
    allEdges.forEach((e) => {
      if (e.source === focusNodeId) ids.add(e.target)
      if (e.target === focusNodeId) ids.add(e.source)
    })
    return ids
  }, [focusNodeId, allEdges])

  // Apply focus + category/link-type filters
  const visibleNodes = useMemo(() => {
    let nodes = focusNeighbours ? allNodes.filter((n) => focusNeighbours.has(n.id)) : allNodes
    if (linkedOnly) nodes = nodes.filter((n) => connectedIds.has(n.id))
    if (isolatedOnly) nodes = nodes.filter((n) => !connectedIds.has(n.id))
    if (hiddenCategories.size > 0) {
      nodes = nodes.filter((n) => !hiddenCategories.has(n.row.category?.trim() ?? ''))
    }
    return nodes
  }, [allNodes, focusNeighbours, linkedOnly, isolatedOnly, connectedIds, hiddenCategories])

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])

  const visibleEdges = useMemo(() => {
    let edges = focusNeighbours
      ? allEdges.filter((e) => focusNeighbours.has(e.source) && focusNeighbours.has(e.target))
      : allEdges
    if (hiddenLinkTypes.size > 0) {
      edges = edges.filter((e) => !hiddenLinkTypes.has(e.linkType))
    }
    edges = edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
    return edges
  }, [allEdges, focusNeighbours, hiddenLinkTypes, visibleNodeIds])

  // Category cluster hulls
  const clusterHulls = useMemo(() => {
    if (!showClusters) return []
    const catNodes = new Map<string, { x: number; y: number }[]>()
    visibleNodes.forEach((n) => {
      const cat = n.row.category?.trim()
      if (!cat) return
      if (!catNodes.has(cat)) catNodes.set(cat, [])
      catNodes.get(cat)!.push({ x: n.x, y: n.y })
    })
    const hulls: { cat: string; color: string; points: { x: number; y: number }[]; cx: number; cy: number; count: number }[] = []
    catNodes.forEach((pts, cat) => {
      const hull = padHull(convexHull(pts), 24)
      if (hull.length === 0) return
      const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
      const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
      hulls.push({ cat, color: catColor(cat, categoryColors), points: hull, cx, cy, count: pts.length })
    })
    return hulls
  }, [showClusters, visibleNodes, categoryColors])

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

  /* ── Mini-map pan ── */

  function mmCoordToTransform(mmX: number, mmY: number) {
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const targetSimX = mmX / MM_SCALE_X
    const targetSimY = mmY / MM_SCALE_Y
    setTransform((t) => ({
      ...t,
      x: svgRect.width  / 2 - targetSimX * t.scale,
      y: svgRect.height / 2 - targetSimY * t.scale,
    }))
  }

  function onMiniMapMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    e.stopPropagation()
    mmDragging.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    mmCoordToTransform(e.clientX - rect.left, e.clientY - rect.top)
  }

  function onMiniMapMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!mmDragging.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    mmCoordToTransform(e.clientX - rect.left, e.clientY - rect.top)
  }

  function onMiniMapMouseUp() { mmDragging.current = false }

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

  function handleNodeDblClick(e: React.MouseEvent, node: SimNode) {
    e.stopPropagation()
    setFocusNodeId((prev) => prev === node.id ? null : node.id)
    setContextMenu(null)
  }

  function handleNodeContextMenu(e: React.MouseEvent, node: SimNode) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
    setTooltip(null)
  }

  /* ── Key edges for hovered node ── */

  const hoveredEdges = useMemo(() => {
    if (hoveredId === null) return new Set<string>()
    const s = new Set<string>()
    visibleEdges.forEach((e) => {
      if (e.source === hoveredId || e.target === hoveredId) {
        const key = e.source < e.target ? `${e.source}-${e.target}` : `${e.target}-${e.source}`
        s.add(key)
      }
    })
    return s
  }, [hoveredId, visibleEdges])

  // Tooltip edge-type badges for hovered node
  const tooltipEdgeTypes = useMemo(() => {
    if (!tooltip) return []
    const types = new Map<LinkType, number>()
    allEdges.forEach((e) => {
      if (e.source === tooltip.node.id || e.target === tooltip.node.id) {
        types.set(e.linkType, (types.get(e.linkType) ?? 0) + 1)
      }
    })
    return [...types.entries()]
  }, [tooltip, allEdges])

  /* ── Pin / Unpin ── */

  function togglePin(nodeId: number) {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  /* ── Expand neighbours ── */

  function expandNeighbours(node: SimNode) {
    const ids = new Set<number>([node.id])
    allEdges.forEach((e) => {
      if (e.source === node.id) ids.add(e.target)
      if (e.target === node.id) ids.add(e.source)
    })
    setFocusNodeId(node.id)
    setContextMenu(null)
  }

  /* ── Add link (LinkPicker save) ── */

  function handleLinkPickerConfirm(links: { title: string; type: LinkType }[]) {
    if (!linkPickerFor) return
    const existing = linkPickerFor.row.links || ''
    const newLinks = links.map((l) => formatLink(l.title, l.type)).join(' ')
    const merged = [existing.trim(), newLinks].filter(Boolean).join(' ')
    updateRowLocally(linkPickerFor.row._rowIndex, { links: merged })
    setLinkPickerFor(null)
  }

  /* ── Filter toggles ── */

  function toggleLinkType(type: LinkType) {
    setHiddenLinkTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function toggleCategory(cat: string) {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-ink3">
        <Network className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">No entries yet</p>
      </div>
    )
  }

  const noLinks = explicitEdges.length === 0

  /* ── Viewport rect for mini-map ── */
  const svgW = svgRef.current?.clientWidth  ?? 800
  const svgH = svgRef.current?.clientHeight ?? 500
  const vpX  = (-transform.x / transform.scale) * MM_SCALE_X
  const vpY  = (-transform.y / transform.scale) * MM_SCALE_Y
  const vpW  = (svgW / transform.scale) * MM_SCALE_X
  const vpH  = (svgH / transform.scale) * MM_SCALE_Y

  const allLinkTypes: LinkType[] = ['references', 'related', 'supports', 'contradicts', 'partOf', 'untyped']

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>

      {/* ── Controls (top-left) ── */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">

        {/* Stats badge */}
        <div className="bg-surface/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-xs text-ink2 shadow">
          <span className="font-semibold text-ink">{linkedCount}</span> linked
          <> · <span className="font-semibold text-ink">{unlinkedCount}</span> unlinked</>
          {' · '}
          <span className="font-semibold text-brand">{explicitEdges.length}</span> edge{explicitEdges.length !== 1 ? 's' : ''}
          {totalNodes > 300 && (
            <span className="ml-1 text-amber-500">(perf mode)</span>
          )}
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
            onClick={() => {
              setShowOrphans((v) => !v)
              setIsolatedOnly(false)
            }}
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
          <button
            onClick={() => {
              setShowOrphans(true)
              setLinkedOnly(false)
              setIsolatedOnly((v) => !v)
            }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm',
              isolatedOnly
                ? 'bg-brand text-white border-brand'
                : 'bg-surface/90 border-border text-ink3 hover:text-ink backdrop-blur-sm',
            )}
          >
            <Target className="w-3 h-3" />
            Isolated only
          </button>
          <button
            onClick={() => setShowClusters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm',
              showClusters
                ? 'bg-surface/90 border-brand/40 text-brand backdrop-blur-sm'
                : 'bg-surface/90 border-border text-ink3 hover:text-ink backdrop-blur-sm',
            )}
          >
            <Network className="w-3 h-3" />
            Clusters
          </button>
          <button
            onClick={() => setShowFilterPanel((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm',
              showFilterPanel || hiddenLinkTypes.size > 0 || hiddenCategories.size > 0 || linkedOnly || isolatedOnly
                ? 'bg-brand text-white border-brand'
                : 'bg-surface/90 border-border text-ink2 hover:text-ink backdrop-blur-sm',
            )}
          >
            <Filter className="w-3 h-3" />
            Filters
            {(hiddenLinkTypes.size + hiddenCategories.size) > 0 && (
              <span className="ml-0.5 bg-white/20 text-[10px] rounded-full px-1">
                {hiddenLinkTypes.size + hiddenCategories.size}
              </span>
            )}
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

      {/* ── Filter panel ── */}
      {showFilterPanel && (
        <div className="absolute top-3 left-48 z-20 bg-surface/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-3 w-52 max-h-[70vh] overflow-y-auto">
          <p className="text-[11px] font-semibold text-ink mb-2 uppercase tracking-wide">View</p>
          <label className="flex items-center gap-2 text-xs text-ink2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={linkedOnly}
              onChange={(e) => {
                setLinkedOnly(e.target.checked)
                if (e.target.checked) setIsolatedOnly(false)
              }}
              className="rounded"
            />
            Linked entries only
          </label>
          <label className="flex items-center gap-2 text-xs text-ink2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isolatedOnly}
              onChange={(e) => {
                setIsolatedOnly(e.target.checked)
                setShowOrphans(true)
                if (e.target.checked) setLinkedOnly(false)
              }}
              className="rounded"
            />
            Isolated entries only
          </label>

          <p className="text-[11px] font-semibold text-ink mb-1.5 uppercase tracking-wide">Edge types</p>
          <div className="flex flex-col gap-1 mb-3">
            {allLinkTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 text-xs text-ink2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenLinkTypes.has(type)}
                  onChange={() => toggleLinkType(type)}
                  className="rounded"
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: LINK_TYPE_COLORS[type] }}
                />
                {LINK_TYPE_LABELS[type]}
              </label>
            ))}
          </div>

          {allCategories.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-ink mb-1.5 uppercase tracking-wide">Categories</p>
              <div className="flex flex-col gap-1">
                {allCategories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-xs text-ink2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenCategories.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="rounded"
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: catColor(cat, categoryColors) }}
                    />
                    <span className="truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {(hiddenLinkTypes.size > 0 || hiddenCategories.size > 0 || linkedOnly || isolatedOnly) && (
            <button
              onClick={() => { setHiddenLinkTypes(new Set()); setHiddenCategories(new Set()); setLinkedOnly(false); setIsolatedOnly(false) }}
              className="mt-3 text-xs text-brand hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Legend (top-right) ── */}
      <div className="absolute top-3 right-3 z-20 bg-surface/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow text-[11px] text-ink2 space-y-1 max-w-[160px]">
        {(Object.entries(LINK_TYPE_COLORS) as [LinkType, string][])
          .filter(([type]) => type !== 'untyped')
          .map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={color} strokeWidth="2" /></svg>
              <span className="truncate">{LINK_TYPE_LABELS[type]}</span>
            </div>
          ))}
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          <span>Untyped / mention</span>
        </div>
        <div className="mt-1 pt-1 border-t border-border text-ink3">
          Drag · Scroll · Dbl-click focus
        </div>
      </div>

      {/* ── Focus cluster banner ── */}
      {focusNodeId !== null && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-surface border border-brand/30 rounded-full px-4 py-2 shadow-lg">
            <Target className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-medium text-ink">
              Focused: {nodeById.get(focusNodeId)?.row.title?.slice(0, 30) ?? 'node'}
              {' · '}{(focusNeighbours?.size ?? 1) - 1} neighbours
            </span>
            <button
              onClick={() => setFocusNodeId(null)}
              className="text-xs text-brand hover:text-brand/70 font-semibold ml-1"
            >
              Show all
            </button>
          </div>
        </div>
      )}

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

          {/* ── Category cluster hulls ── */}
          {showClusters && clusterHulls.map((hull) => {
            if (hull.points.length < 2) return null
            const pts = hull.points.map((p) => `${p.x},${p.y}`).join(' ')
            return (
              <g key={`hull-${hull.cat}`}>
                <polygon
                  points={pts}
                  fill={hull.color}
                  fillOpacity={0.12}
                  stroke={hull.color}
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                />
                <text
                  x={hull.cx}
                  y={hull.cy - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={hull.color}
                  fillOpacity={0.8}
                  style={{ pointerEvents: 'none', userSelect: 'none', fontWeight: 600 }}
                >
                  {hull.cat} ({hull.count})
                </text>
              </g>
            )
          })}

          {/* ── Edges ── */}
          {visibleEdges.map((edge) => {
            const s = nodeById.get(edge.source)
            const t = nodeById.get(edge.target)
            if (!s || !t) return null
            const key = `${edge.source}-${edge.target}`
            const edgeKey = edge.source < edge.target ? key : `${edge.target}-${edge.source}`
            const isHovered = hoveredEdges.has(edgeKey)
            const isExplicit = edge.kind === 'explicit'
            const color = LINK_TYPE_COLORS[edge.linkType] ?? '#94a3b8'
            return (
              <line
                key={`e-${key}`}
                x1={s.x} y1={s.y}
                x2={t.x} y2={t.y}
                stroke={color}
                strokeWidth={isHovered ? 2.5 : (isExplicit ? 1.5 : 1)}
                strokeDasharray={isExplicit ? undefined : '5 4'}
                strokeOpacity={hoveredId !== null ? (isHovered ? 1 : 0.2) : (isExplicit ? 0.72 : 0.35)}
                style={{ transition: 'stroke-opacity 0.15s' }}
              />
            )
          })}

          {/* ── Nodes ── */}
          {visibleNodes.map((node) => {
            const color      = catColor(node.row.category, categoryColors)
            const isHovered  = hoveredId === node.id
            const isFocused  = focusNodeId === node.id
            const isPinned   = pinnedIds.has(node.id)
            const isRelated  = hoveredId !== null && hoveredEdges.size > 0 && (() => {
              const k1 = hoveredId < node.id ? `${hoveredId}-${node.id}` : `${node.id}-${hoveredId}`
              return hoveredEdges.has(k1)
            })()
            const dimmed     = hoveredId !== null && !isHovered && !isRelated
            const isOrphan   = !connectedIds.has(node.id)
            const r          = isHovered ? 12 : isFocused ? 13 : (isOrphan ? 7 : 9)

            return (
              <g
                key={`n-${node.id}`}
                transform={`translate(${node.x},${node.y})`}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.15s' }}
                onClick={() => openModal(node.row)}
                onDoubleClick={(e) => handleNodeDblClick(e, node)}
                onContextMenu={(e) => handleNodeContextMenu(e, node)}
                onMouseEnter={(e) => handleNodeEnter(e, node)}
                onMouseLeave={handleNodeLeave}
              >
                {isHovered && (
                  <circle r={r + 6} fill={color} fillOpacity={0.15} />
                )}
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={isOrphan ? 0.4 : 0.85}
                  stroke={isPinned ? '#f59e0b' : isHovered ? color : 'var(--color-surface)'}
                  strokeWidth={isPinned ? 2.5 : isHovered ? 2 : 1.5}
                  strokeDasharray={isPinned ? '3 2' : undefined}
                />
                {isPinned && (
                  <circle r={3} fill="#f59e0b" fillOpacity={0.9} cx={r - 2} cy={-(r - 2)} />
                )}
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
              y={orphanNodes.length > 0
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

      {/* ── Mini-map (bottom-right) ── */}
      <div className="absolute bottom-4 right-4 z-20 bg-surface/90 backdrop-blur-sm border border-border rounded-xl shadow-lg overflow-hidden" style={{ width: MM_W + 2, height: MM_H + 2 }}>
        <svg
          width={MM_W}
          height={MM_H}
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseDown={onMiniMapMouseDown}
          onMouseMove={onMiniMapMouseMove}
          onMouseUp={onMiniMapMouseUp}
          onMouseLeave={onMiniMapMouseUp}
        >
          {/* Mini edges */}
          {visibleEdges.slice(0, 300).map((edge) => {
            const s = nodeById.get(edge.source)
            const t = nodeById.get(edge.target)
            if (!s || !t) return null
            return (
              <line
                key={`mm-e-${edge.source}-${edge.target}`}
                x1={s.x * MM_SCALE_X}
                y1={s.y * MM_SCALE_Y}
                x2={t.x * MM_SCALE_X}
                y2={t.y * MM_SCALE_Y}
                stroke={LINK_TYPE_COLORS[edge.linkType] ?? '#94a3b8'}
                strokeWidth={0.5}
                strokeOpacity={0.4}
              />
            )
          })}
          {/* Mini nodes */}
          {visibleNodes.map((node) => (
            <circle
              key={`mm-n-${node.id}`}
              cx={node.x * MM_SCALE_X}
              cy={node.y * MM_SCALE_Y}
              r={1.5}
              fill={catColor(node.row.category, categoryColors)}
              fillOpacity={0.8}
            />
          ))}
          {/* Viewport rect */}
          <rect
            x={Math.max(0, vpX)}
            y={Math.max(0, vpY)}
            width={Math.min(vpW, MM_W - Math.max(0, vpX))}
            height={Math.min(vpH, MM_H - Math.max(0, vpY))}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={1}
            strokeOpacity={0.7}
          />
        </svg>
      </div>

      {/* ── Tooltip (enhanced) ── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 14 }}
        >
          <div className="bg-surface border border-border rounded-xl shadow-xl px-3 py-2 max-w-[240px]">
            <p className="text-sm font-semibold text-ink truncate">{tooltip.node.row.title || 'Untitled'}</p>
            {tooltip.node.row.category && (
              <span
                className="inline-block text-[10px] font-medium text-white rounded-full px-2 py-0.5 mt-1"
                style={{ background: catColor(tooltip.node.row.category, categoryColors) }}
              >
                {tooltip.node.row.category}
              </span>
            )}
            {tooltipEdgeTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tooltipEdgeTypes.map(([type, count]) => (
                  <span
                    key={type}
                    className="text-[10px] font-medium rounded-full px-1.5 py-0.5 text-white"
                    style={{ background: LINK_TYPE_COLORS[type] }}
                  >
                    {LINK_TYPE_LABELS[type]} ×{count}
                  </span>
                ))}
              </div>
            )}
            {(tooltip.node.row.rewritten || tooltip.node.row.original) && (
              <p className="text-[11px] text-ink3 mt-1 line-clamp-2 leading-relaxed">
                {(tooltip.node.row.rewritten || tooltip.node.row.original || '').slice(0, 50)}…
              </p>
            )}
            <p className="text-[10px] text-ink3 mt-1.5 italic">Click · Dbl-click focus · Right-click menu</p>
          </div>
        </div>
      )}

      {/* ── Context menu (enhanced) ── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl py-1 min-w-[180px] animate-fadeIn"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1.5 border-b border-border mb-1">
              <p className="text-xs font-semibold text-ink truncate max-w-[160px]">
                {contextMenu.node.row.title || 'Untitled'}
              </p>
            </div>
            <button
              onClick={() => { openModal(contextMenu.node.row); setContextMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-hover transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-ink3" />
              Open entry
            </button>
            <button
              onClick={() => {
                setFocusNodeId((prev) => prev === contextMenu.node.id ? null : contextMenu.node.id)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-hover transition-colors"
            >
              <Target className="w-3.5 h-3.5 text-brand" />
              {focusNodeId === contextMenu.node.id ? 'Exit focus' : 'Focus cluster'}
            </button>
            <button
              onClick={() => { expandNeighbours(contextMenu.node) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-hover transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-ink3" />
              Expand neighbours
            </button>
            <button
              onClick={() => { setLinkPickerFor(contextMenu.node); setContextMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-hover transition-colors"
            >
              <UserSearch className="w-3.5 h-3.5 text-ink3" />
              Add link from here
            </button>
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { togglePin(contextMenu.node.id); setContextMenu(null) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-hover transition-colors"
              >
                {pinnedIds.has(contextMenu.node.id)
                  ? <><PinOff className="w-3.5 h-3.5 text-amber-500" /> Unpin node</>
                  : <><Pin className="w-3.5 h-3.5 text-ink3" /> Pin node</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Link Picker modal ── */}
      {linkPickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-ink">
                Add link from: {linkPickerFor.row.title || 'Untitled'}
              </p>
            </div>
            <div className="p-4">
              <LinkPicker
                excludeRowIndex={linkPickerFor.row._rowIndex}
                onConfirm={handleLinkPickerConfirm}
                onClose={() => setLinkPickerFor(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
