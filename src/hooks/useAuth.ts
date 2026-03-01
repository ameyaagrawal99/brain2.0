import { useEffect, useCallback, useRef } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { initTokenClient, requestToken, revokeToken } from '@/lib/gsi'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export function useAuth() {
  const { setAuthState } = useBrainStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (!CLIENT_ID) {
      setAuthState({ isAuthenticated: false, token: null, error: 'VITE_GOOGLE_CLIENT_ID not set', loading: false })
      return
    }

    // Safety timeout: if GSI script hasn't loaded after 10 s, stop showing the spinner.
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
      }
    }, 10_000)

    // Poll until GSI script loads
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        clearInterval(interval)
        clearTimeout(timeout)
        if (initialized.current) return
        initialized.current = true
        initTokenClient(
          CLIENT_ID,
          (token) => setAuthState({ isAuthenticated: true, token, error: null, loading: false }),
          (error) => setAuthState({ isAuthenticated: false, token: null, error, loading: false }),
          // Silent failure: no active session — stop spinner and show login screen quietly.
          ()      => setAuthState({ isAuthenticated: false, token: null, error: null, loading: false }),
        )
        // Attempt silent token acquisition via hidden iframe (not a popup — safe to call on load).
        // If the user has an active Google session and has previously granted consent,
        // this re-authenticates them on every reload without any interaction.
        requestToken(true)
      }
    }, 100)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [setAuthState])

  // signIn MUST be called directly from a button onClick
  const signIn = useCallback(() => {
    try { requestToken(false) } catch (e) { console.error(e) }
  }, [])

  const signOut = useCallback(() => {
    revokeToken()
    setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
  }, [setAuthState])

  return { signIn, signOut }
}
