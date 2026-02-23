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
>

export type SortKey =
  | 'date-desc'
  | 'date-asc'
  | 'title-asc'
  | 'cat-asc'
  | 'num-asc'
  | 'num-desc'

export type ViewMode = 'card' | 'table'
