import { useEffect, useCallback, useRef } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { initTokenClient, requestToken, revokeToken } from '@/lib/gsi'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export function useAuth() {
  const { setAuthState } = useBrainStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!CLIENT_ID) {
      setAuthState({ isAuthenticated: false, token: null, error: 'VITE_GOOGLE_CLIENT_ID not set' })
      return
    }
    // Poll until GSI script loads
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        clearInterval(interval)
        if (initialized.current) return
        initialized.current = true
        initTokenClient(
          CLIENT_ID,
          (token) => setAuthState({ isAuthenticated: true, token, error: null }),
          (error) => setAuthState({ isAuthenticated: false, token: null, error }),
        )
        // DO NOT call requestToken silently here — Chrome blocks popups not
        // triggered by a direct user gesture. The user must click Sign In.
      }
    }, 100)
    return () => clearInterval(interval)
  }, [setAuthState])

  // signIn MUST be called directly from a button onClick
  const signIn = useCallback(() => {
    try { requestToken(false) } catch (e) { console.error(e) }
  }, [])

  const signOut = useCallback(() => {
    revokeToken()
    setAuthState({ isAuthenticated: false, token: null, error: null })
  }, [setAuthState])

  return { signIn, signOut }
}
