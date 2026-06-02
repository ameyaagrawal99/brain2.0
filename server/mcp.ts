/**
 * Brain 2.0 — MCP (Model Context Protocol) Server
 *
 * Exposes Brain 2.0 knowledge base as Claude-accessible tools.
 * Run: npm run mcp
 * Claude Desktop config example:
 *   { "mcpServers": { "brain": { "url": "http://localhost:3001/mcp" } } }
 *
 * Required env vars:
 *   BRAIN_SHEET_ID       - Google Sheets ID
 *   GOOGLE_ACCESS_TOKEN  - OAuth2 access token (from Brain 2.0 app or gcloud auth)
 *   MCP_AUTH_TOKEN       - Bearer token clients must send (optional, for security)
 *   BRAIN_SHEET_NAME     - data sheet tab name (default Sheet1)
 *   PORT                 - port to listen on (default 3001)
 */

import http from 'node:http'

const SHEET_ID    = process.env.BRAIN_SHEET_ID ?? ''
const SHEET_NAME  = process.env.BRAIN_SHEET_NAME ?? 'Sheet1'
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN ?? ''
const AUTH_TOKEN  = process.env.MCP_AUTH_TOKEN ?? ''
const PORT        = Number(process.env.PORT ?? 3001)
const MAX_BULK_WRITE = Math.max(1, Number(process.env.MCP_MAX_BULK_WRITE ?? 25))

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
  updatedAt:   string
  mediaUrl:    string
}

type EditableColumn =
  | 'title'
  | 'category'
  | 'subCategory'
  | 'original'
  | 'rewritten'
  | 'actionItems'
  | 'dueDate'
  | 'taskStatus'
  | 'links'
  | 'mediaUrl'
  | 'tags'
  | 'people'

type NewEntryFields = Partial<Record<EditableColumn, string>>

const EDITABLE_COLUMNS = new Set<EditableColumn>([
  'title', 'category', 'subCategory', 'original', 'rewritten', 'actionItems',
  'dueDate', 'taskStatus', 'links', 'mediaUrl', 'tags', 'people',
])

const STATUS_VALUES = new Set(['Pending', 'In Progress', 'In Review', 'Done', 'Blocked'])

function textArg(args: Record<string, unknown>, key: string, fallback = ''): string {
  const value = args[key]
  return typeof value === 'string' ? value.trim() : fallback
}

function boolArg(args: Record<string, unknown>, key: string, fallback = false): boolean {
  return typeof args[key] === 'boolean' ? args[key] : fallback
}

function numberArg(args: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(args[key] ?? fallback)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function normalizeStatus(status: string): string {
  const cleaned = status.trim()
  const match = [...STATUS_VALUES].find((s) => s.toLowerCase() === cleaned.toLowerCase())
  return match ?? cleaned
}

function validateDate(value: string, fieldName: string): void {
  if (!value) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} must use YYYY-MM-DD format`)
  }
}

function isDone(entry: BrainEntry): boolean {
  return /done|complete/i.test(entry.taskStatus)
}

function matchesQuery(entry: BrainEntry, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const hay = [
    entry.title, entry.category, entry.subCategory, entry.original, entry.rewritten,
    entry.actionItems, entry.tags, entry.people, entry.links,
  ].join(' ').toLowerCase()
  return words.every((word) => hay.includes(word))
}

function formatEntryLine(entry: BrainEntry): string {
  return `• **${entry.title}** [${entry.category || 'Uncategorized'}] — ${entry.taskStatus || 'no status'}${entry.dueDate ? ` · due ${entry.dueDate}` : ''}`
}

function formatEntryDetails(entry: BrainEntry): string {
  return [
    `# ${entry.title}`,
    `**Category:** ${entry.category || 'none'}${entry.subCategory ? ` › ${entry.subCategory}` : ''}`,
    `**Status:** ${entry.taskStatus || 'none'} | **Due:** ${entry.dueDate || 'none'}`,
    `**Tags:** ${entry.tags || 'none'} | **People:** ${entry.people || 'none'}`,
    '',
    entry.rewritten || entry.original || '(no content)',
    entry.actionItems ? `\n**Action items:**\n${entry.actionItems}` : '',
    entry.links ? `\n**Links:** ${entry.links}` : '',
  ].filter(Boolean).join('\n')
}

function pickFields(args: Record<string, unknown>): NewEntryFields {
  const fields: NewEntryFields = {}
  for (const key of EDITABLE_COLUMNS) {
    const value = args[key]
    if (typeof value === 'string') fields[key] = value.trim()
  }
  if (fields.dueDate) validateDate(fields.dueDate, 'dueDate')
  if (fields.taskStatus) fields.taskStatus = normalizeStatus(fields.taskStatus)
  return fields
}

/* ── Fetch sheet data ──────────────────────────────────────────────────── */
async function fetchSheet(): Promise<BrainEntry[]> {
  if (!SHEET_ID) throw new Error('BRAIN_SHEET_ID not set')
  if (!ACCESS_TOKEN) throw new Error('GOOGLE_ACCESS_TOKEN not set')

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!A:Q`)}`
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
      updatedAt:   r[C.updatedAt]   ?? '',
      mediaUrl:    r[C.mediaUrl]    ?? '',
    }))
}

/* ── Update a single cell ─────────────────────────────────────────────── */
async function updateCell(rowIndex: number, colName: keyof typeof C, value: string) {
  const colLetter = String.fromCharCode(65 + C[colName])
  const range = `${SHEET_NAME}!${colLetter}${rowIndex}`
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

async function updateCells(rowIndex: number, fields: NewEntryFields): Promise<void> {
  const data = Object.entries(fields)
    .filter(([key]) => EDITABLE_COLUMNS.has(key as EditableColumn))
    .map(([key, value]) => {
      const colLetter = String.fromCharCode(65 + C[key as keyof typeof C])
      const range = `${SHEET_NAME}!${colLetter}${rowIndex}`
      return { range, values: [[value ?? '']] }
    })

  if (data.length === 0) throw new Error('No editable fields supplied')

  data.push({
    range: `${SHEET_NAME}!${String.fromCharCode(65 + C.updatedAt)}${rowIndex}`,
    values: [[new Date().toISOString()]],
  })

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate?valueInputOption=RAW`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets batch write error ${res.status}: ${text.slice(0, 200)}`)
  }
}

async function appendEntry(fields: NewEntryFields): Promise<void> {
  const now = new Date().toISOString()
  const row = Array.from({ length: 16 }, () => '')
  row[C.title] = fields.title ?? ''
  row[C.createdAt] = now
  row[C.updatedAt] = ''
  row[C.category] = fields.category ?? ''
  row[C.subCategory] = fields.subCategory ?? ''
  row[C.original] = fields.original ?? ''
  row[C.rewritten] = fields.rewritten ?? ''
  row[C.actionItems] = fields.actionItems ?? ''
  row[C.dueDate] = fields.dueDate ?? ''
  row[C.taskStatus] = fields.taskStatus ?? 'Pending'
  row[C.links] = fields.links ?? ''
  row[C.mediaUrl] = fields.mediaUrl ?? ''
  row[C.tags] = fields.tags ?? ''
  row[C.messageId] = ''
  row[C.people] = fields.people ?? ''

  const range = `${SHEET_NAME}!A:Q`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets append error ${res.status}: ${text.slice(0, 200)}`)
  }
}

function findEntry(entries: BrainEntry[], title: string): BrainEntry | undefined {
  const query = title.toLowerCase()
  return entries.find((e) => e.title.toLowerCase() === query)
    ?? entries.find((e) => e.title.toLowerCase().includes(query))
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
    description: 'Update the task status of a Brain 2.0 entry. Supports dryRun preview.',
    inputSchema: {
      type: 'object',
      required: ['title', 'status'],
      properties: {
        title:  { type: 'string', description: 'Entry title (exact match)' },
        status: { type: 'string', description: 'New status (e.g. "Done", "In Progress", "Pending")' },
        dryRun: { type: 'boolean', description: 'If true, preview without writing' },
      },
    },
  },
  {
    name: 'brain_bulk_update_status',
    description: 'Update the task status for multiple entries that match a filter. Requires confirm:true to write.',
    inputSchema: {
      type: 'object',
      required: ['status'],
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        tag:      { type: 'string', description: 'Filter by tag' },
        status:   { type: 'string', description: 'New status to apply' },
        dryRun:   { type: 'boolean', description: 'If true, preview changes without applying' },
        confirm:  { type: 'boolean', description: 'Must be true to apply bulk changes' },
      },
    },
  },
  {
    name: 'brain_create_entry',
    description: 'Create a new Brain 2.0 entry in the Google Sheet. Supports dryRun preview.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title:       { type: 'string', description: 'Entry title' },
        original:    { type: 'string', description: 'Raw note/body' },
        category:    { type: 'string' },
        subCategory: { type: 'string' },
        taskStatus:  { type: 'string', description: 'Pending, In Progress, In Review, Done, or Blocked' },
        dueDate:     { type: 'string', description: 'YYYY-MM-DD' },
        tags:        { type: 'string', description: 'Comma-separated tags' },
        people:      { type: 'string', description: 'Comma-separated people' },
        links:       { type: 'string' },
        mediaUrl:    { type: 'string' },
        dryRun:      { type: 'boolean', description: 'If true, preview without writing' },
      },
    },
  },
  {
    name: 'brain_update_entry',
    description: 'Update editable fields on one Brain 2.0 entry by title. Supports dryRun preview.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title:       { type: 'string', description: 'Entry title to find' },
        newTitle:    { type: 'string', description: 'Optional replacement title' },
        original:    { type: 'string' },
        rewritten:   { type: 'string' },
        category:    { type: 'string' },
        subCategory: { type: 'string' },
        actionItems: { type: 'string' },
        dueDate:     { type: 'string', description: 'YYYY-MM-DD' },
        taskStatus:  { type: 'string' },
        tags:        { type: 'string' },
        people:      { type: 'string' },
        links:       { type: 'string' },
        mediaUrl:    { type: 'string' },
        dryRun:      { type: 'boolean', description: 'If true, preview without writing' },
      },
    },
  },
  {
    name: 'brain_overdue',
    description: 'List overdue and due-soon active tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Include tasks due within this many days (default 0)' },
        limit:     { type: 'number', description: 'Maximum entries (default 20)' },
      },
    },
  },
  {
    name: 'brain_digest',
    description: 'Generate a concise Brain 2.0 digest: overdue, due soon, active work, recent entries, and top tags/categories.',
    inputSchema: {
      type: 'object',
      properties: {
        daysAhead: { type: 'number', description: 'Due-soon window in days (default 7)' },
        recent:    { type: 'number', description: 'Recent entries to include (default 5)' },
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
    if (args.overdue)  filtered = filtered.filter(e => e.dueDate && e.dueDate < today && !isDone(e))
    const limit = numberArg(args, 'limit', 20)
    filtered = filtered.slice(0, limit)
    if (filtered.length === 0) return 'No entries match the filter.'
    return filtered.map(formatEntryLine).join('\n')
  }

  if (name === 'brain_search') {
    const query = String(args.query ?? '').toLowerCase()
    const entries = await fetchSheet()
    const limit = numberArg(args, 'limit', 10)
    const results = entries
      .filter(e => matchesQuery(e, query))
      .slice(0, limit)
    if (results.length === 0) return `No entries found for: "${args.query}"`
    return results.map(e =>
      `**${e.title}** [${e.category}]\n${(e.rewritten || e.original).slice(0, 200)}${(e.rewritten || e.original).length > 200 ? '…' : ''}`
    ).join('\n\n---\n\n')
  }

  if (name === 'brain_get_entry') {
    const entries = await fetchSheet()
    const entry = findEntry(entries, textArg(args, 'title'))
    if (!entry) return `Entry not found: "${args.title}"`
    return formatEntryDetails(entry)
  }

  if (name === 'brain_stats') {
    const entries = await fetchSheet()
    const total   = entries.length
    const done    = entries.filter(isDone).length
    const active  = entries.filter(e => e.taskStatus.toLowerCase().includes('progress') || e.taskStatus.toLowerCase().includes('review')).length
    const overdue = entries.filter(e => e.dueDate && e.dueDate < today && !isDone(e)).length
    const cats: Record<string, number> = {}
    entries.forEach(e => { if (e.category) cats[e.category] = (cats[e.category] ?? 0) + 1 })
    const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `  ${c}: ${n}`).join('\n')
    return `**Brain 2.0 Stats**\n\nTotal: ${total} entries\nDone: ${done} | Active: ${active} | Overdue: ${overdue}\n\nTop categories:\n${topCats}`
  }

  if (name === 'brain_update_status') {
    const entries = await fetchSheet()
    const entry = findEntry(entries, textArg(args, 'title'))
    if (!entry) return `Entry not found: "${args.title}"`
    const status = normalizeStatus(textArg(args, 'status'))
    if (boolArg(args, 'dryRun')) {
      return `**Dry run** — would update "${entry.title}" status: ${entry.taskStatus || 'none'} → ${status}`
    }
    await updateCell(entry.rowIndex, 'taskStatus', status)
    return `Updated "${entry.title}" status → ${status}`
  }

  if (name === 'brain_bulk_update_status') {
    const entries = await fetchSheet()
    let targets = [...entries]
    if (args.category) targets = targets.filter(e => e.category.toLowerCase().includes(String(args.category).toLowerCase()))
    if (args.tag)      targets = targets.filter(e => e.tags.toLowerCase().includes(String(args.tag).toLowerCase()))
    if (targets.length === 0) return 'No entries match the filter.'
    if (targets.length > MAX_BULK_WRITE) {
      return `Refusing to update ${targets.length} entries. Narrow the filter or raise MCP_MAX_BULK_WRITE.`
    }
    const status = normalizeStatus(textArg(args, 'status'))
    const preview = targets.map(e => `• ${e.title} [${e.taskStatus || 'none'} → ${status}]`).join('\n')
    if (boolArg(args, 'dryRun', true) || !boolArg(args, 'confirm')) {
      return `**Dry run** — would update ${targets.length} entries. Re-run with confirm:true and dryRun:false to apply:\n${preview}`
    }
    for (const e of targets) await updateCell(e.rowIndex, 'taskStatus', status)
    return `Updated ${targets.length} entries to "${status}":\n${preview}`
  }

  if (name === 'brain_create_entry') {
    const fields = pickFields(args)
    if (!fields.title) throw new Error('title is required')
    const preview = formatEntryDetails({
      rowIndex: 0,
      title: fields.title,
      category: fields.category ?? '',
      subCategory: fields.subCategory ?? '',
      taskStatus: fields.taskStatus ?? 'Pending',
      dueDate: fields.dueDate ?? '',
      tags: fields.tags ?? '',
      people: fields.people ?? '',
      original: fields.original ?? '',
      rewritten: fields.rewritten ?? '',
      actionItems: fields.actionItems ?? '',
      links: fields.links ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: '',
      mediaUrl: fields.mediaUrl ?? '',
    })
    if (boolArg(args, 'dryRun')) return `**Dry run** — would create:\n\n${preview}`
    await appendEntry(fields)
    return `Created Brain 2.0 entry: "${fields.title}"`
  }

  if (name === 'brain_update_entry') {
    const entries = await fetchSheet()
    const entry = findEntry(entries, textArg(args, 'title'))
    if (!entry) return `Entry not found: "${args.title}"`
    const fields = pickFields({ ...args, title: args.newTitle ?? undefined })
    if (!args.newTitle) delete fields.title
    if (Object.keys(fields).length === 0) throw new Error('No editable fields supplied')
    const preview = Object.entries(fields)
      .map(([field, value]) => `• ${field}: ${(entry as unknown as Record<string, string>)[field] || 'none'} → ${value || 'empty'}`)
      .join('\n')
    if (boolArg(args, 'dryRun')) return `**Dry run** — would update "${entry.title}":\n${preview}`
    await updateCells(entry.rowIndex, fields)
    return `Updated "${entry.title}":\n${preview}`
  }

  if (name === 'brain_overdue') {
    const entries = await fetchSheet()
    const daysAhead = numberArg(args, 'daysAhead', 0)
    const limit = numberArg(args, 'limit', 20)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    const due = entries
      .filter((e) => e.dueDate && e.dueDate <= cutoffIso && !isDone(e))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, limit)
    if (!due.length) return daysAhead > 0 ? `No active tasks due within ${daysAhead} days.` : 'No overdue active tasks.'
    return due.map(formatEntryLine).join('\n')
  }

  if (name === 'brain_digest') {
    const entries = await fetchSheet()
    const daysAhead = numberArg(args, 'daysAhead', 7)
    const recentLimit = numberArg(args, 'recent', 5)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)
    const cutoffIso = cutoff.toISOString().slice(0, 10)
    const overdue = entries.filter((e) => e.dueDate && e.dueDate < today && !isDone(e)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const dueSoon = entries.filter((e) => e.dueDate && e.dueDate >= today && e.dueDate <= cutoffIso && !isDone(e)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const active = entries.filter((e) => !isDone(e)).slice(0, 8)
    const recent = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, recentLimit)
    const cats: Record<string, number> = {}
    const tags: Record<string, number> = {}
    entries.forEach((e) => {
      if (e.category) cats[e.category] = (cats[e.category] ?? 0) + 1
      e.tags.split(/[,#]/).map((t) => t.trim()).filter(Boolean).forEach((tag) => { tags[tag] = (tags[tag] ?? 0) + 1 })
    })
    const top = (obj: Record<string, number>) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} (${v})`).join(', ') || 'none'
    return [
      '# Brain 2.0 Digest',
      '',
      `Total entries: ${entries.length}`,
      `Overdue: ${overdue.length} | Due soon (${daysAhead}d): ${dueSoon.length} | Active: ${active.length}`,
      '',
      '## Overdue',
      overdue.slice(0, 8).map(formatEntryLine).join('\n') || 'None',
      '',
      '## Due Soon',
      dueSoon.slice(0, 8).map(formatEntryLine).join('\n') || 'None',
      '',
      '## Active Focus',
      active.slice(0, 8).map(formatEntryLine).join('\n') || 'None',
      '',
      '## Recent Entries',
      recent.map(formatEntryLine).join('\n') || 'None',
      '',
      `Top categories: ${top(cats)}`,
      `Top tags: ${top(tags)}`,
    ].join('\n')
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
