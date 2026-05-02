import assert from 'node:assert/strict'
import {
  getAuthStartupPolicy,
  shouldFetchContactsOnDemand,
} from '../src/lib/startupPolicy'

assert.deepEqual(
  getAuthStartupPolicy(false),
  { showLoginImmediately: true, silentRetryDelaysMs: [], oneTapGraceMs: 0 },
)

assert.deepEqual(
  getAuthStartupPolicy(true),
  { showLoginImmediately: false, silentRetryDelaysMs: [1200], oneTapGraceMs: 2500 },
)

assert.equal(shouldFetchContactsOnDemand({ contactsCount: 0, contactsConnected: false, isLoading: false }), true)
assert.equal(shouldFetchContactsOnDemand({ contactsCount: 12, contactsConnected: true, isLoading: false }), false)
assert.equal(shouldFetchContactsOnDemand({ contactsCount: 0, contactsConnected: false, isLoading: true }), false)

console.log('startupPolicy tests passed')
