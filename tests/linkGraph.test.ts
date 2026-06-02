import assert from 'node:assert/strict'
import test from 'node:test'
import { getBacklinks, getOrphanRows, getRelatedMemories } from '../src/lib/linkGraph.ts'
import type { BrainRow } from '../src/types/sheet.ts'

function row(patch: Partial<BrainRow>): BrainRow {
  return {
    _rowIndex: 1,
    _dirty: false,
    srNo: '1',
    title: 'Untitled',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '',
    category: 'Work',
    subCategory: '',
    original: '',
    rewritten: '',
    actionItems: '',
    dueDate: '',
    taskStatus: '',
    links: '',
    mediaUrl: '',
    tags: '',
    messageId: '',
    people: '',
    ...patch,
  }
}

test('detects backlinks and orphan memories', () => {
  const target = row({ _rowIndex: 2, title: 'Decision Log' })
  const source = row({ _rowIndex: 3, title: 'Project Notes', links: '[[Decision Log|references]]' })
  const orphan = row({ _rowIndex: 4, title: 'Loose Thought' })
  const rows = [target, source, orphan]

  const backlinks = getBacklinks(target, rows)
  assert.equal(backlinks.length, 1)
  assert.equal(backlinks[0].row.title, 'Project Notes')
  assert.equal(backlinks[0].type, 'references')
  assert.deepEqual(getOrphanRows(rows).map((r) => r.title), ['Loose Thought'])
})

test('scores related memories by links, tags, category, and people', () => {
  const current = row({ _rowIndex: 2, title: 'Launch Plan', category: 'Work', tags: '#launch, #writing', people: 'Ameya' })
  const linked = row({ _rowIndex: 3, title: 'Launch Risks', links: '[[Launch Plan]]' })
  const shared = row({ _rowIndex: 4, title: 'Writing Sprint', category: 'Work', tags: '#writing', people: 'Ameya' })
  const unrelated = row({ _rowIndex: 5, title: 'Groceries', category: 'Personal' })

  const related = getRelatedMemories(current, [current, linked, shared, unrelated])
  assert.deepEqual(related.map((item) => item.row.title), ['Launch Risks', 'Writing Sprint'])
  assert.ok(related[0].reasons.includes('backlink'))
  assert.ok(related[1].reasons.some((reason) => reason.startsWith('shared tags')))
})
