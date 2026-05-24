import { SHEETS_SCOPE, CONTACTS_SCOPE, CONTACTS_OTHER_SCOPE } from '@/constants/sheet'
import { logger } from './logger'

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0
let _pendingSilentCount = 0  // number of in-flight silent requests
let _refreshTimer: ReturnType<typeof setTimeout> | null = null
let _gisScriptPromise: Promise<void> | null = null

/* ── Session hint ────────────────────────────────────────────────────────
 * A lightweight localStorage flag that survives page refreshes.
 * It tells useAuth that this is a returning user who should be
 * silently re-authenticated, so the app shows "Reconnecting…" instead
 * of immediately jumping to the login screen.
 */
const SESSION_KEY    = 'brain2_session'
const LOGIN_HINT_KEY = 'brain2_login_hint'

export function setSessionHint(): void {
  try { localStorage.setItem(SESSION_KEY, '1') } catch { /* ignore */ }
}
export function clearSessionHint(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LOGIN_HINT_KEY)
  } catch { /* ignore */ }
}
export function hasSessionHint(): boolean {
  try { return localStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}

/** Store user's email so it can be used as login_hint for silent re-auth */
export function setLoginHint(email: string): void {
  try { if (email) localStorage.setItem(LOGIN_HINT_KEY, email) } catch { /* ignore */ }
}
export function getLoginHint(): string | null {
  try { return localStorage.getItem(LOGIN_HINT_KEY) } catch { return null }
}

export function loadGisScript(): Promise<void> {
  if (typeof google !== 'undefined' && google?.accounts?.oauth2) return Promise.resolve()
  if (_gisScriptPromise) return _gisScriptPromise

  _gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })

  return _gisScriptPromise
}

/**
 * Decode a JWT payload (no signature verification — only used for display/hints).
 */
function decodeJwtPayload(jwt: string): Record<string, string> {
  try {
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
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
    logger.info('[GSI] Auto-refreshing token silently…')
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
      logger.info('[GSI] Token received, expires in', response.expires_in, 'seconds')
      setSessionHint()  // mark that user has an active session (survives refresh)
      scheduleTokenRefresh(response.expires_in)
      onToken(response.access_token)
      tokenListeners.forEach((fn) => fn(response.access_token))
      // Fetch user email for future login_hint after a short delay
      _fetchAndStoreLoginHint(response.access_token)
    },
    error_callback: (err: ErrorResponse) => {
      const wasSilent = _pendingSilentCount > 0
      if (wasSilent) _pendingSilentCount = Math.max(0, _pendingSilentCount - 1)
      logger.warn('[GSI] Error (silent=%s):', wasSilent, err.type, err.message)
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

/**
 * After getting a token, fetch the user's email from Google and store it
 * as a login_hint. This dramatically improves silent re-auth on page refresh.
 */
async function _fetchAndStoreLoginHint(token: string): Promise<void> {
  // Skip if we already have a hint stored
  if (getLoginHint()) return
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json() as { email?: string }
      if (data.email) {
        setLoginHint(data.email)
        logger.info('[GSI] Stored login_hint for future silent auth')
      }
    }
  } catch {
    /* non-fatal */
  }
}

export function requestToken(silent = false) {
  if (!tokenClient) throw new Error('Token client not initialized')
  if (silent) _pendingSilentCount++
  const hint = getLoginHint()
  tokenClient.requestAccessToken({
    prompt: silent ? 'none' : '',
    // login_hint tells GIS which account to use — skips account picker and
    // improves silent auth success rate (especially with FedCM/no 3rd-party cookies)
    ...(hint ? { login_hint: hint } : {}),
  })
}

/**
 * Initialise Google One Tap as a fallback for silent re-authentication.
 * One Tap uses FedCM in Chrome (no third-party cookies needed) and provides
 * a credential (ID token) that we decode to extract the user's email, which
 * is then stored as a login_hint and used for the OAuth access token request.
 *
 * This is called when the initial silent token request fails — One Tap can
 * re-establish the session without requiring a full login popup.
 */
export function initOneTapFallback(
  clientId: string,
  onTokenObtained: () => void,
): void {
  if (!google?.accounts?.id) return
  const hint = getLoginHint()
  google.accounts.id.initialize({
    client_id: clientId,
    auto_select: true,
    cancel_on_tap_outside: false,
    ...(hint ? { login_hint: hint } : {}),
    callback: (credentialResponse: CredentialResponse) => {
      // Decode the credential JWT to get the email
      const payload = decodeJwtPayload(credentialResponse.credential)
      if (payload.email) {
        setLoginHint(payload.email)
        logger.info('[GSI] One Tap credential received, stored login_hint:', payload.email)
      }
      // Now request an access token using the hint — this should succeed silently
      // since the user just authenticated via One Tap
      _pendingSilentCount++
      tokenClient?.requestAccessToken({
        prompt: 'none',
        ...(payload.email ? { login_hint: payload.email } : {}),
      })
      onTokenObtained()
    },
  })
  // Prompt for One Tap — if auto_select matches a known account, it fires automatically
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      logger.info('[GSI] One Tap not displayed or skipped')
    }
  })
}

export function getAccessToken(): string | null {
  if (!accessToken) return null
  if (Date.now() >= tokenExpiry) {
    logger.warn('[GSI] Token expired')
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
  // Cancel any pending One Tap prompt
  try { google.accounts.id.cancel() } catch { /* ignore */ }
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
