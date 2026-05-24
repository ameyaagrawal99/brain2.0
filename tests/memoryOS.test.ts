import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMemorySignals,
  buildSourcePacket,
  classifyMemoryType,
  extractThemes,
} from '../src/lib/memoryOS.ts'
import type { BrainRow } from '../src/types/sheet.ts'

function row(patch: Partial<BrainRow>): BrainRow {
  return {
    _rowIndex: 2,
    _dirty: false,
    srNo: '1',
    title: 'Untitled',
    createdAt: '2026-05-24T10:00:00.000Z',
    updatedAt: '',
    category: 'Journal',
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

test('classifies writing and decision memory types from existing row text', () => {
  assert.equal(classifyMemoryType(row({
    title: 'Article idea: leadership is discomfort',
    original: 'Essay about how leadership means choosing hard conversations.',
    tags: '#writing',
  })), 'Article Idea')

  assert.equal(classifyMemoryType(row({
    title: 'Decision on publishing',
    original: 'I decided to publish weekly despite the tradeoff.',
  })), 'Decision')
})

test('extracts durable themes from tags and memory content', () => {
  const themes = extractThemes(row({
    title: 'Deep work protocol',
    original: 'A focus routine for better writing and discipline.',
    tags: '#craft',
  }))
  assert.ok(themes.includes('writing'))
  assert.ok(themes.includes('discipline'))
  assert.ok(themes.includes('craft'))
})

test('builds source packets without mutating sheet fields', () => {
  const signals = buildMemorySignals([
    row({
      title: 'Book fragment on ambition',
      original: 'I realized ambition is not hunger alone. It is the ability to metabolize responsibility.',
      tags: '#ambition, #book',
      people: 'Ameya',
      links: '[[Leadership]]',
    }),
  ])

  assert.equal(signals.length, 1)
  assert.equal(signals[0].type, 'Book Fragment')
  assert.ok(signals[0].sourceStrength > 50)

  const packet = buildSourcePacket(signals, 'Ambition')
  assert.match(packet, /# Source Packet: Ambition/)
  assert.match(packet, /Book fragment on ambition/)
  assert.match(packet, /Core insight:/)
})
