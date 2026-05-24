import assert from 'node:assert/strict'
import test from 'node:test'
import { filterAndSortRows } from '../src/lib/filterRows.ts'
import type { BrainRow } from '../src/types/sheet.ts'

function row(patch: Partial<BrainRow>): BrainRow {
  return {
    _rowIndex: 1,
    _dirty: false,
    srNo: '1',
    title: 'Untitled',
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '',
    category: 'Work',
    subCategory: 'Planning',
    original: 'I am joyful about shipping this useful feature.',
    rewritten: '',
    actionItems: '',
    dueDate: '',
    taskStatus: 'Pending',
    links: '',
    mediaUrl: '',
    tags: '#work, #focus',
    messageId: '',
    people: 'Ameya, Priya',
    ...patch,
  }
}

const rows = [
  row({ _rowIndex: 2, srNo: '2', title: 'Ship feature', taskStatus: 'In Progress', dueDate: '2026-05-24' }),
  row({ _rowIndex: 3, srNo: '3', title: 'Blocked item', category: 'Personal', tags: '#home', people: 'Ria', taskStatus: 'Blocked', createdAt: '2026-05-20T10:00:00.000Z', original: 'I feel sad and worried about this delay.' }),
  row({ _rowIndex: 4, srNo: '4', title: 'Done item', taskStatus: 'Done', tags: '#work, #done', createdAt: '2026-05-10T10:00:00.000Z' }),
]

test('filters by date ranges and today fallback', () => {
  assert.deepEqual(filterAndSortRows(rows, { dateFrom: '2026-05-20', dateTo: '2026-05-24' }, null).map((r) => r.title), ['Ship feature', 'Blocked item'])
  assert.deepEqual(filterAndSortRows(rows, { showToday: true }, null, '2026-05-24').map((r) => r.title), ['Ship feature'])
})

test('filters by due date ranges independently of created dates', () => {
  assert.deepEqual(filterAndSortRows(rows, { dueDateFrom: '2026-05-24', dueDateTo: '2026-05-24' }, null).map((r) => r.title), ['Ship feature'])
  assert.deepEqual(filterAndSortRows(rows, { dueDateTo: '2026-05-23' }, null).map((r) => r.title), [])
})

test('filters by status, tags, people, and category', () => {
  assert.deepEqual(filterAndSortRows(rows, { statuses: ['blocked'] }, null).map((r) => r.title), ['Blocked item'])
  assert.deepEqual(filterAndSortRows(rows, { selectedTags: ['work', 'focus'], tagMatchMode: 'and' }, null).map((r) => r.title), ['Ship feature'])
  assert.deepEqual(filterAndSortRows(rows, { selectedTags: ['home', 'done'], tagMatchMode: 'or' }, null).map((r) => r.title), ['Blocked item', 'Done item'])
  assert.deepEqual(filterAndSortRows(rows, { persons: ['Priya'], categories: ['Work'] }, null).map((r) => r.title), ['Ship feature', 'Done item'])
})

test('filters by sentiment tone and emotion', () => {
  assert.deepEqual(filterAndSortRows(rows, {}, { kind: 'tone', value: 'Positive' }).map((r) => r.title), ['Ship feature', 'Done item'])
  assert.deepEqual(filterAndSortRows(rows, {}, { kind: 'emotion', value: 'sadness' }).map((r) => r.title), ['Blocked item'])
})
