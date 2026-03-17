/**
 * Brain 2.0 — MCP (Model Context Protocol) Server
 *
 * Exposes Brain 2.0 knowledge base as Claude-accessible tools.
 * Run: npx tsx server/mcp.ts
 * Claude Desktop config example:
 *   { "mcpServers": { "brain": { "url": "http://localhost:3001/mcp" } } }
 *
 * Required env vars:
 *   BRAIN_SHEET_ID       - Google Sheets ID
 *   GOOGLE_ACCESS_TOKEN  - OAuth2 access token (from Brain 2.0 app or gcloud auth)
 *   MCP_AUTH_TOKEN       - Bearer token clients must send (optional, for security)
 *   PORT                 - port to listen on (default 3001)
 */

import http from 'node:http'

const SHEET_ID    = process.env.BRAIN_SHEET_ID ?? ''
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN ?? ''
const AUTH_TOKEN  = process.env.MCP_AUTH_TOKEN ?? ''
const PORT        = Number(process.env.PORT ?? 3001)

/* ── Column indices (0-based), matching parseRows.ts ──────────────────── */
const C = {
  srNo: 0, title: 1, createdAt: 2, updatedAt: 3, category: 4,
  subCategory: 5, original: 6, rewritten: 7, actionItems: 8,
  dueDate: 9, taskStatus: 10, links: 11, mediaUrl: 12,
  tags: 13, messageId: 14, people: 15,
}

interface BrainEntry {
  rowIndex: number
  title:       string
  category:    string
  subCategory: string
  taskStatus:  string
  dueDate:     string
  tags:        string
  people:      string
  original:    string
  rewritten:   string
  actionItems: string
  links:       string
  createdAt:   string
}

/* ── Fetch sheet data ──────────────────────────────────────────────────── */
async function fetchSheet(): Promise<BrainEntry[]> {
  if (!SHEET_ID) throw new Error('BRAIN_SHEET_ID not set')
  if (!ACCESS_TOKEN) throw new Error('GOOGLE_ACCESS_TOKEN not set')

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A:Q`
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets API error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { values?: string[][] }
  const rows = (data.values ?? []).slice(1) // skip header row

  return rows
    .filter((r) => r[C.title]?.trim())
    .map((r, i) => ({
      rowIndex:    i + 2,
      title:       r[C.title]       ?? '',
      category:    r[C.category]    ?? '',
      subCategory: r[C.subCategory] ?? '',
      taskStatus:  r[C.taskStatus]  ?? '',
      dueDate:     r[C.dueDate]     ?? '',
      tags:        r[C.tags]        ?? '',
      people:      r[C.people]      ?? '',
      original:    r[C.original]    ?? '',
      rewritten:   r[C.rewritten]   ?? '',
      actionItems: r[C.actionItems] ?? '',
      links:       r[C.links]       ?? '',
      createdAt:   r[C.createdAt]   ?? '',
    }))
}

/* ── Update a single cell ─────────────────────────────────────────────── */
async function updateCell(rowIndex: number, colName: keyof typeof C, value: string) {
  const colLetter = String.fromCharCode(65 + C[colName])
  const range = `Sheet1!${colLetter}${rowIndex}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[value]] }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets write error ${res.status}: ${text.slice(0, 200)}`)
  }
}

/* ── Tool definitions ─────────────────────────────────────────────────── */
const TOOLS = [
  {
    name: 'brain_list',
    description: 'List Brain 2.0 entries with optional filters. Returns titles, categories, statuses, and due dates.',
    inputSchema: {
      type: 'object',
      properties: {
        category:   { type: 'string', description: 'Filter by category (case-insensitive partial match)' },
        status:     { type: 'string', description: 'Filter by task status (e.g. "done", "in progress", "pending")' },
        tag:        { type: 'string', description: 'Filter entries containing this tag' },
        overdue:    { type: 'boolean', description: 'If true, return only overdue entries' },
        limit:      { type: 'number', description: 'Maximum entries to return (default 20)' },
      },
    },
  },
  {
    name: 'brain_search',
    description: 'Full-text search across Brain 2.0 entries (title, body, tags, people).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default 10)' },
      },
    },
  },
  {
    name: 'brain_get_entry',
    description: 'Get full details of a specific Brain 2.0 entry by title.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Entry title (exact or partial match)' },
      },
    },
  },
  {
    name: 'brain_stats',
    description: 'Get statistics about the Brain 2.0 knowledge base (counts, categories, statuses, overdue tasks).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'brain_update_status',
    description: 'Update the task status of a Brain 2.0 entry.',
    inputSchema: {
      type: 'object',
      required: ['title', 'status'],
      properties: {
        title:  { type: 'string', description: 'Entry title (exact match)' },
        status: { type: 'string', description: 'New status (e.g. "Done", "In Progress", "Pending")' },
      },
    },
  },
  {
    name: 'brain_bulk_update_status',
    description: 'Update the task status for multiple entries that match a filter.',
    inputSchema: {
      type: 'object',
      required: ['status'],
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        tag:      { type: 'string', description: 'Filter by tag' },
        status:   { type: 'string', description: 'New status to apply' },
        dryRun:   { type: 'boolean', description: 'If true, preview changes without applying' },
      },
    },
  },
]

/* ── Tool call handlers ───────────────────────────────────────────────── */
async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)

  if (name === 'brain_list') {
    const entries = await fetchSheet()
    let filtered = entries
    if (args.category) filtered = filtered.filter(e => e.category.toLowerCase().includes(String(args.category).toLowerCase()))
    if (args.status)   filtered = filtered.filter(e => e.taskStatus.toLowerCase().includes(String(args.status).toLowerCase()))
    if (args.tag)      filtered = filtered.filter(e => e.tags.toLowerCase().includes(String(args.tag).toLowerCase()))
    if (args.overdue)  filtered = filtered.filter(e => e.dueDate && e.dueDate < today && !e.taskStatus.toLowerCase().includes('done'))
    const limit = Number(args.limit ?? 20)
    filtered = filtered.slice(0, limit)
    if (filtered.length === 0) return 'No entries match the filter.'
    return filtered.map(e =>
      `• **${e.title}** [${e.category}] — ${e.taskStatus || 'no status'}${e.dueDate ? ` · due ${e.dueDate}` : ''}`
    ).join('\n')
  }

  if (name === 'brain_search') {
    const query = String(args.query ?? '').toLowerCase()
    const entries = await fetchSheet()
    const limit = Number(args.limit ?? 10)
    const results = entries
      .filter(e => {
        const hay = `${e.title} ${e.original} ${e.rewritten} ${e.tags} ${e.people}`.toLowerCase()
        return query.split(' ').every(w => hay.includes(w))
      })
      .slice(0, limit)
    if (results.length === 0) return `No entries found for: "${args.query}"`
    return results.map(e =>
      `**${e.title}** [${e.category}]\n${(e.rewritten || e.original).slice(0, 200)}${(e.rewritten || e.original).length > 200 ? '…' : ''}`
    ).join('\n\n---\n\n')
  }

  if (name === 'brain_get_entry') {
    const entries = await fetchSheet()
    const query = String(args.title ?? '').toLowerCase()
    const entry = entries.find(e => e.title.toLowerCase().includes(query))
    if (!entry) return `Entry not found: "${args.title}"`
    return [
      `# ${entry.title}`,
      `**Category:** ${entry.category}${entry.subCategory ? ` › ${entry.subCategory}` : ''}`,
      `**Status:** ${entry.taskStatus || 'none'} | **Due:** ${entry.dueDate || 'none'}`,
      `**Tags:** ${entry.tags || 'none'} | **People:** ${entry.people || 'none'}`,
      '',
      entry.rewritten || entry.original || '(no content)',
      entry.actionItems ? `\n**Action items:**\n${entry.actionItems}` : '',
      entry.links ? `\n**Links:** ${entry.links}` : '',
    ].filter(Boolean).join('\n')
  }

  if (name === 'brain_stats') {
    const entries = await fetchSheet()
    const total   = entries.length
    const done    = entries.filter(e => e.taskStatus.toLowerCase().includes('done') || e.taskStatus.toLowerCase().includes('complete')).length
    const active  = entries.filter(e => e.taskStatus.toLowerCase().includes('progress') || e.taskStatus.toLowerCase().includes('review')).length
    const overdue = entries.filter(e => e.dueDate && e.dueDate < today && !e.taskStatus.toLowerCase().includes('done')).length
    const cats: Record<string, number> = {}
    entries.forEach(e => { if (e.category) cats[e.category] = (cats[e.category] ?? 0) + 1 })
    const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `  ${c}: ${n}`).join('\n')
    return `**Brain 2.0 Stats**\n\nTotal: ${total} entries\nDone: ${done} | Active: ${active} | Overdue: ${overdue}\n\nTop categories:\n${topCats}`
  }

  if (name === 'brain_update_status') {
    const entries = await fetchSheet()
    const entry = entries.find(e => e.title.toLowerCase() === String(args.title ?? '').toLowerCase())
    if (!entry) return `Entry not found: "${args.title}"`
    await updateCell(entry.rowIndex, 'taskStatus', String(args.status))
    return `Updated "${entry.title}" status → ${args.status}`
  }

  if (name === 'brain_bulk_update_status') {
    const entries = await fetchSheet()
    let targets = [...entries]
    if (args.category) targets = targets.filter(e => e.category.toLowerCase().includes(String(args.category).toLowerCase()))
    if (args.tag)      targets = targets.filter(e => e.tags.toLowerCase().includes(String(args.tag).toLowerCase()))
    if (targets.length === 0) return 'No entries match the filter.'
    const preview = targets.map(e => `• ${e.title} [${e.taskStatus || 'none'} → ${args.status}]`).join('\n')
    if (args.dryRun) return `**Dry run** — would update ${targets.length} entries:\n${preview}`
    for (const e of targets) await updateCell(e.rowIndex, 'taskStatus', String(args.status))
    return `Updated ${targets.length} entries to "${args.status}":\n${preview}`
  }

  throw new Error(`Unknown tool: ${name}`)
}

/* ── JSON-RPC 2.0 MCP handler ─────────────────────────────────────────── */
interface JsonRpcRequest { jsonrpc: string; id: unknown; method: string; params?: unknown }

async function handleMcp(req: JsonRpcRequest): Promise<object> {
  const { id, method, params = {} } = req
  const p = params as Record<string, unknown>

  try {
    if (method === 'initialize') {
      return { jsonrpc: '2.0', id, result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'brain2-mcp', version: '1.0.0' },
      }}
    }

    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
    }

    if (method === 'tools/call') {
      const name = String(p.name ?? '')
      const args = (p.arguments ?? {}) as Record<string, unknown>
      const text = await callTool(name, args)
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } }
    }

    if (method === 'notifications/initialized') {
      return { jsonrpc: '2.0', id, result: {} }
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
  } catch (err) {
    return { jsonrpc: '2.0', id, error: { code: -32000, message: err instanceof Error ? err.message : String(err) } }
  }
}

/* ── HTTP server ──────────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // Auth check
  if (AUTH_TOKEN) {
    const authHeader = req.headers['authorization'] ?? ''
    if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }
  }

  if (req.method !== 'POST' || req.url !== '/mcp') {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', sheet: !!SHEET_ID, auth: !!ACCESS_TOKEN }))
      return
    }
    res.writeHead(404); res.end()
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk
  let parsed: JsonRpcRequest
  try {
    parsed = JSON.parse(body)
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }))
    return
  }

  const response = await handleMcp(parsed)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
})

server.listen(PORT, () => {
  console.log(`Brain 2.0 MCP server running on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
  if (!SHEET_ID)     console.warn('⚠  BRAIN_SHEET_ID not set')
  if (!ACCESS_TOKEN) console.warn('⚠  GOOGLE_ACCESS_TOKEN not set')
  if (!AUTH_TOKEN)   console.warn('⚠  MCP_AUTH_TOKEN not set (server is open)')
})
