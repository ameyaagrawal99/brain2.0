export interface ParsedLink {
  title: string
  type: LinkType
  raw: string
}

export interface BrainRow {
  _rowIndex: number   // 1-based sheet row (row 1 = header, data from row 2)
  _dirty: boolean     // has unsaved local edits

  srNo: string
  title: string
  createdAt: string
  updatedAt: string
  category: string
  subCategory: string
  original: string
  rewritten: string
  actionItems: string
  dueDate: string
  taskStatus: string
  links: string
  mediaUrl: string
  tags: string
  messageId: string
  people: string   // comma-separated contact names linked to this entry
}

export type EditableFields = Pick<
  BrainRow,
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
>

export type SortKey =
  | 'date-desc'
  | 'date-asc'
  | 'title-asc'
  | 'cat-asc'
  | 'num-asc'
  | 'num-desc'

export type ViewMode = 'card' | 'table' | 'board' | 'graph' | 'stats' | 'memory'

/** Relationship type for typed wiki-links [[Title|type]] */
export type LinkType =
  | 'references'
  | 'related'
  | 'supports'
  | 'contradicts'
  | 'partOf'
  | 'untyped'

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  references:  'References',
  related:     'Related to',
  supports:    'Supports',
  contradicts: 'Contradicts',
  partOf:      'Part of',
  untyped:     'Linked',
}

export const LINK_TYPE_COLORS: Record<LinkType, string> = {
  references:  '#6366f1',
  related:     '#8b5cf6',
  supports:    '#10b981',
  contradicts: '#ef4444',
  partOf:      '#f59e0b',
  untyped:     '#94a3b8',
}

export interface SpecialDay {
  id: string
  title: string
  date: string       // ISO date: "YYYY-MM-DD"
  description?: string
  emoji?: string
  imageUrl?: string  // image URL (stored in meta JSON, displayed as <img>)
  links?: string     // newline-separated URLs
}

export interface HistoryEntry {
  fields:  Partial<EditableFields>
  savedAt: string   // ISO timestamp
  label:   string   // e.g. "Edit" | "AI: Rewrite" | "AI: Enhance all"
}
