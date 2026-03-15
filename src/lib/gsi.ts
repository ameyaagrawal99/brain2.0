import { SHEETS_SCOPE, CONTACTS_SCOPE, CONTACTS_OTHER_SCOPE } from '@/constants/sheet'

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0
let _pendingSilentCount = 0  // number of in-flight silent requests
let _refreshTimer: ReturnType<typeof setTimeout> | null = null

/* ── Session hint ────────────────────────────────────────────────────────
 * A lightweight localStorage flag that survives page refreshes.
 * It tells useAuth that this is a returning user who should be
 * silently re-authenticated, so the app shows "Reconnecting…" instead
 * of immediately jumping to the login screen.
 */
const SESSION_KEY = 'brain2_session'

export function setSessionHint(): void {
  try { localStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
}
export function clearSessionHint(): void {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
}
export function hasSessionHint(): boolean {
  try { return localStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}

/**
 * Schedule a silent token refresh ~5 minutes before expiry.
 * This keeps the user logged in without requiring any interaction.
 */
function scheduleTokenRefresh(expiresIn: number) {
  if (_refreshTimer) clearTimeout(_refreshTimer)
  // Refresh 5 min before expiry; if token is shorter than 10 min, refresh at halfway point
  const refreshInSec = expiresIn > 600 ? expiresIn - 300 : Math.floor(expiresIn / 2)
  const refreshInMs  = Math.max(0, refreshInSec * 1000)
  _refreshTimer = setTimeout(() => {
    console.log('[GSI] Auto-refreshing token silently…')
    try { requestToken(true) } catch { /* ignore if not yet initialised */ }
  }, refreshInMs)
}

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
      setSessionHint()  // mark that user has an active session (survives refresh)
      scheduleTokenRefresh(response.expires_in)
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
  if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null }
  clearSessionHint()  // user explicitly signed out — don't try to silently re-auth
  if (!accessToken) return
  google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null
    tokenExpiry = 0
  })
}

/**
 * Request an access token that includes the Google Contacts read-only scope.
 * This shows a consent dialog if the user hasn't granted contacts permission yet.
 * On success, the module-level accessToken is updated to one that covers both
 * Sheets and Contacts — subsequent API calls will automatically use it.
 */
export function requestContactsAccess(
  clientId: string,
  onToken: (token: string) => void,
  onError: (msg: string) => void,
) {
  const scope = `${SHEETS_SCOPE} ${CONTACTS_SCOPE} ${CONTACTS_OTHER_SCOPE}`
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    // prompt: 'consent' forces the consent screen even if user previously granted some scopes.
    // This is needed to add the new Contacts scope to an existing session.
    callback: (response: TokenResponse) => {
      if (response.error) { onError(response.error); return }
      // Promote token to module level — now covers both Sheets + Contacts.
      accessToken = response.access_token
      tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
      scheduleTokenRefresh(response.expires_in)
      onToken(response.access_token)
      tokenListeners.forEach((fn) => fn(response.access_token))
    },
    error_callback: (err: ErrorResponse) => {
      if (err.type !== 'popup_closed') onError(err.message ?? err.type)
    },
  })
  client.requestAccessToken({ prompt: 'consent' })
}
