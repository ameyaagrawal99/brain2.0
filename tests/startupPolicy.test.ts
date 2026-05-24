import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getAuthStartupPolicy,
  shouldFetchContactsOnDemand,
} from '../src/lib/startupPolicy.ts'

test('getAuthStartupPolicy shows login immediately for new users', () => {
  assert.deepEqual(
    getAuthStartupPolicy(false),
    { showLoginImmediately: true, silentRetryDelaysMs: [], oneTapGraceMs: 0 },
  )
})

test('getAuthStartupPolicy gives returning users a short reconnect window', () => {
  assert.deepEqual(
    getAuthStartupPolicy(true),
    { showLoginImmediately: false, silentRetryDelaysMs: [1200], oneTapGraceMs: 2500 },
  )
})

test('shouldFetchContactsOnDemand fetches only when no contacts are loaded or loading', () => {
  assert.equal(shouldFetchContactsOnDemand({ contactsCount: 0, contactsConnected: false, isLoading: false }), true)
  assert.equal(shouldFetchContactsOnDemand({ contactsCount: 12, contactsConnected: true, isLoading: false }), false)
  assert.equal(shouldFetchContactsOnDemand({ contactsCount: 0, contactsConnected: false, isLoading: true }), false)
})
