export interface AuthStartupPolicy {
  showLoginImmediately: boolean
  silentRetryDelaysMs: number[]
  oneTapGraceMs: number
}

export function getAuthStartupPolicy(isReturningUser: boolean): AuthStartupPolicy {
  if (!isReturningUser) {
    return {
      showLoginImmediately: true,
      silentRetryDelaysMs: [],
      oneTapGraceMs: 0,
    }
  }

  return {
    showLoginImmediately: false,
    silentRetryDelaysMs: [1200],
    oneTapGraceMs: 2500,
  }
}

export interface ContactsDemandState {
  contactsCount: number
  contactsConnected: boolean
  isLoading: boolean
}

export function shouldFetchContactsOnDemand(state: ContactsDemandState): boolean {
  return !state.isLoading && !state.contactsConnected && state.contactsCount === 0
}
