import assert from 'node:assert/strict'
import test from 'node:test'
import { addLocalDays, coerceDate, monthDay, toLocalISODate } from '../src/lib/date.ts'

test('toLocalISODate formats the local calendar date', () => {
  assert.equal(toLocalISODate(new Date(2026, 4, 24, 23, 30)), '2026-05-24')
})

test('addLocalDays moves by local calendar days', () => {
  assert.equal(toLocalISODate(addLocalDays(new Date(2026, 4, 24), 7)), '2026-05-31')
  assert.equal(toLocalISODate(addLocalDays(new Date(2026, 4, 24), -1)), '2026-05-23')
})

test('monthDay extracts month and day from ISO date strings', () => {
  assert.equal(monthDay('2026-05-24'), '05-24')
})

test('coerceDate accepts Date and date strings, rejects invalid input', () => {
  assert.equal(coerceDate(new Date(2026, 4, 24))?.getFullYear(), 2026)
  assert.equal(coerceDate('2026-05-24T00:00:00.000Z')?.getUTCFullYear(), 2026)
  assert.equal(coerceDate('not a date'), null)
  assert.equal(coerceDate(null), null)
})
