import { SHEETS_SCOPE } from '@/constants/sheet'

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0
let _pendingSilentCount = 0  // number of in-flight silent requests

// Listeners to notify when a new token arrives
const tokenListeners: Array<(token: string) => void> = []

export function onTokenReady(fn: (token: string) => void) {
  tokenListeners.push(fn)
  return () => {
    const idx = tokenListeners.indexOf(fn)
    if (idx !== -1) tokenListeners.splice(idx, 1)
  }
}

/**
 * Initialise the GIS token client.
 * Idempotent — if already initialised, does nothing and returns false.
 * Returns true when initialisation actually happened (caller should then
 * attempt a silent token request).
 */
export function initTokenClient(
  clientId: string,
  onToken: (token: string) => void,
  onError: (msg: string) => void,
  onSilentFailure?: () => void,
): boolean {
  // Idempotent: only one tokenClient per session. Prevents the double-init
  // that occurs because useAuth() is called from both App and LoginScreen.
  if (tokenClient !== null) return false

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_SCOPE,
    callback: (response: TokenResponse) => {
      _pendingSilentCount = 0   // any in-flight silent requests are now resolved
      if (response.error) { onError(response.error); return }
      // Set module-level token BEFORE calling listeners
      accessToken = response.access_token
      tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
      console.log('[GSI] Token received, expires in', response.expires_in, 'seconds')
      onToken(response.access_token)
      tokenListeners.forEach((fn) => fn(response.access_token))
    },
    error_callback: (err: ErrorResponse) => {
      const wasSilent = _pendingSilentCount > 0
      if (wasSilent) _pendingSilentCount = Math.max(0, _pendingSilentCount - 1)
      console.warn('[GSI] Error (silent=%s):', wasSilent, err.type, err.message)
      if (wasSilent) {
        // Silent failures are expected (no active session / consent not yet granted).
        // Don't surface as an error — just let the caller know so it can stop loading.
        onSilentFailure?.()
      } else if (err.type !== 'popup_closed') {
        onError(err.message ?? err.type)
      }
    },
  })
  return true
}

export function requestToken(silent = false) {
  if (!tokenClient) throw new Error('Token client not initialized')
  if (silent) _pendingSilentCount++
  tokenClient.requestAccessToken({ prompt: silent ? 'none' : '' })
}

export function getAccessToken(): string | null {
  if (!accessToken) return null
  if (Date.now() >= tokenExpiry) {
    console.warn('[GSI] Token expired')
    return null
  }
  return accessToken
}

export function revokeToken() {
  if (!accessToken) return
  google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null
    tokenExpiry = 0
  })
}
