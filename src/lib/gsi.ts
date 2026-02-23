import { SHEETS_SCOPE } from '@/constants/sheet'

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0

// Listeners to notify when a new token arrives
const tokenListeners: Array<(token: string) => void> = []

export function onTokenReady(fn: (token: string) => void) {
  tokenListeners.push(fn)
  return () => {
    const idx = tokenListeners.indexOf(fn)
    if (idx !== -1) tokenListeners.splice(idx, 1)
  }
}

export function initTokenClient(
  clientId: string,
  onToken: (token: string) => void,
  onError: (msg: string) => void,
) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_SCOPE,
    callback: (response: TokenResponse) => {
      if (response.error) { onError(response.error); return }
      // Set module-level token BEFORE calling listeners
      accessToken = response.access_token
      tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
      console.log('[GSI] Token received, expires in', response.expires_in, 'seconds')
      onToken(response.access_token)
      tokenListeners.forEach((fn) => fn(response.access_token))
    },
    error_callback: (err: ErrorResponse) => {
      console.warn('[GSI] Error:', err.type, err.message)
      if (err.type !== 'popup_closed') {
        onError(err.message ?? err.type)
      }
    },
  })
}

export function requestToken(silent = false) {
  if (!tokenClient) throw new Error('Token client not initialized')
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
