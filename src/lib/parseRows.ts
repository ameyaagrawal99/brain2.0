import { BrainRow } from '@/types/sheet'
import { COL } from '@/constants/sheet'

function cell(row: string[], idx: number): string {
  return (row[idx] ?? '').trim()
}

export function parseRows(rawValues: string[][]): BrainRow[] {
  if (!rawValues || rawValues.length < 2) return []
  // row 0 is header, data starts at index 1 → sheet row 2
  return rawValues.slice(1).map((row, i) => ({
    _rowIndex: i + 2,
    _dirty: false,
    srNo:        cell(row, COL.SR_NO),
    title:       cell(row, COL.TITLE),
    createdAt:   cell(row, COL.CREATED_AT),
    updatedAt:   cell(row, COL.UPDATED_AT),
    category:    cell(row, COL.CATEGORY),
    subCategory: cell(row, COL.SUB_CATEGORY),
    original:    cell(row, COL.ORIGINAL),
    rewritten:   cell(row, COL.REWRITTEN),
    actionItems: cell(row, COL.ACTION_ITEMS),
    dueDate:     cell(row, COL.DUE_DATE),
    taskStatus:  cell(row, COL.TASK_STATUS),
    links:       cell(row, COL.LINKS),
    mediaUrl:    cell(row, COL.MEDIA_URL),
    tags:        cell(row, COL.TAGS),
    messageId:   cell(row, COL.MESSAGE_ID),
  })).filter(r => r.srNo || r.title || r.original || r.rewritten)
}

export function rowToValues(row: BrainRow): string[] {
  return [
    row.srNo, row.title, row.createdAt, row.updatedAt,
    row.category, row.subCategory, row.original, row.rewritten,
    row.actionItems, row.dueDate, row.taskStatus,
    row.links, row.mediaUrl, row.tags, row.messageId,
  ]
}
