import assert from 'node:assert/strict'
import test from 'node:test'
import { getTaskDueLane, getTaskMetadata } from '../src/lib/taskMetadata.ts'
import type { BrainRow } from '../src/types/sheet.ts'

function row(patch: Partial<BrainRow>): BrainRow {
  return {
    _rowIndex: 1,
    _dirty: false,
    srNo: '1',
    title: 'Task',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '',
    category: 'Work',
    subCategory: '',
    original: '',
    rewritten: '',
    actionItems: '',
    dueDate: '',
    taskStatus: 'Pending',
    links: '',
    mediaUrl: '',
    tags: '',
    messageId: '',
    people: '',
    ...patch,
  }
}

test('groups tasks into stable due-date swimlanes', () => {
  const today = new Date(2026, 5, 2)
  assert.equal(getTaskDueLane(row({ dueDate: '2026-06-01' }), today), 'Overdue')
  assert.equal(getTaskDueLane(row({ dueDate: '2026-06-02' }), today), 'Today')
  assert.equal(getTaskDueLane(row({ dueDate: '2026-06-03' }), today), 'Upcoming')
  assert.equal(getTaskDueLane(row({ dueDate: '' }), today), 'No due date')
  assert.equal(getTaskDueLane(row({ dueDate: '2026-06-01', taskStatus: 'Done' }), today), 'Done')
})

test('extracts priority, blockers, recurrence, and subtask progress from existing fields', () => {
  const meta = getTaskMetadata(row({
    tags: '#priority-high #recurring-weekly',
    taskStatus: 'Blocked',
    actionItems: '- [x] Draft\n- [ ] Review\nBlocker: waiting on API key',
  }))

  assert.equal(meta.priority, 'High')
  assert.equal(meta.blocked, true)
  assert.equal(meta.blockerText, 'waiting on API key')
  assert.equal(meta.recurring, true)
  assert.equal(meta.recurrence, 'weekly')
  assert.equal(meta.subtasksDone, 1)
  assert.equal(meta.subtasksTotal, 2)
})
