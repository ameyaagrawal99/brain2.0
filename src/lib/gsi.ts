import { SHEETS_SCOPE } from '@/constants/sheet'

let tokenClient: TokenClient | null = null
let accessToken: string | null = null
let tokenExpiry = 0

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
      accessToken = response.access_token
      tokenExpiry = Date.now() + (response.expires_in - 60) * 1000
      onToken(response.access_token)
    },
    error_callback: (err: ErrorResponse) => {
      // popup_closed is benign — user closed the window, not an error
      if (err.type !== 'popup_closed') {
        onError(err.message ?? err.type)
      }
    },
  })
}

export function requestToken(silent = false) {
  if (!tokenClient) throw new Error('Token client not initialized')
  // prompt: '' = implicit grant (shows popup only if needed)
  // prompt: 'none' = silent check (no popup, may fail)
  tokenClient.requestAccessToken({ prompt: silent ? 'none' : '' })
}

export function getAccessToken(): string | null {
  return accessToken && Date.now() < tokenExpiry ? accessToken : null
}

export function revokeToken() {
  if (!accessToken) return
  google.accounts.oauth2.revoke(accessToken, () => {
    accessToken = null
    tokenExpiry = 0
  })
}
