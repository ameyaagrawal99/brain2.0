import assert from 'node:assert/strict'
import test from 'node:test'
import { parseRows, rowToValues } from '../src/lib/parseRows.ts'

const header = [
  'Sr. No', 'Title', 'Created at', 'Updated at', 'Category', 'Sub Category',
  'Original', 'Rewritten', 'Action Items', 'Due Date', 'Task Status', 'Links',
  'Media URL', 'Tags', 'Message ID', 'People',
]

test('parseRows trims cells and skips empty rows', () => {
  const rows = parseRows([
    header,
    [' 1 ', ' First note ', '2026-05-24', '', ' Work ', ' Planning ', ' Body ', '', '', '2026-05-25', 'Pending', '', '', '#work', 'm1', 'Ameya'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ])

  assert.equal(rows.length, 1)
  assert.equal(rows[0]._rowIndex, 2)
  assert.equal(rows[0].title, 'First note')
  assert.equal(rows[0].category, 'Work')
  assert.equal(rows[0].people, 'Ameya')
})

test('rowToValues preserves sheet column order', () => {
  const [row] = parseRows([
    header,
    ['1', 'Title', '2026-05-24', '2026-05-25', 'Cat', 'Sub', 'Orig', 'Rewrite', '1. Do it', '2026-06-01', 'Done', '[[Other]]', 'https://x.test/image.png', '#tag', 'msg', 'Person'],
  ])

  assert.deepEqual(rowToValues(row), [
    '1', 'Title', '2026-05-24', '2026-05-25', 'Cat', 'Sub', 'Orig',
    'Rewrite', '1. Do it', '2026-06-01', 'Done', '[[Other]]',
    'https://x.test/image.png', '#tag', 'msg', 'Person',
  ])
})
