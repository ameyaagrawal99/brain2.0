import { useEffect, useCallback, useRef } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { initTokenClient, requestToken, revokeToken, hasSessionHint, initOneTapFallback } from '@/lib/gsi'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

/** Max number of silent re-auth retries before falling back to One Tap */
const MAX_SILENT_RETRIES = 3

export function useAuth() {
  const { setAuthState } = useBrainStore()
  const initialized       = useRef(false)
  const silentRetryCount  = useRef(0)
  const oneTapTriggered   = useRef(false)

  useEffect(() => {
    if (!CLIENT_ID) {
      setAuthState({ isAuthenticated: false, token: null, error: 'VITE_GOOGLE_CLIENT_ID not set', loading: false })
      return
    }

    // Returning users get a longer grace period (up to 25s) so retries + One Tap can complete.
    const isReturning = hasSessionHint()
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
      }
    }, isReturning ? 25_000 : 10_000)

    // Poll until GSI script loads
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
        clearInterval(interval)
        clearTimeout(timeout)
        if (initialized.current) return
        initialized.current = true

        // Guard: don't let a stale error/silent-failure callback sign the user out
        // after they've already authenticated (race between silent re-auth and explicit sign-in).
        const safeSignOut = () => {
          if (useBrainStore.getState().authState.isAuthenticated) return

          // Returning users: retry silent auth before showing login screen.
          if (hasSessionHint() && silentRetryCount.current < MAX_SILENT_RETRIES) {
            silentRetryCount.current++
            const delay = silentRetryCount.current * 1500  // 1.5s, 3s, 4.5s
            console.log(`[Auth] Silent auth failed, retrying in ${delay}ms (attempt ${silentRetryCount.current}/${MAX_SILENT_RETRIES})`)
            setTimeout(() => {
              if (!useBrainStore.getState().authState.isAuthenticated) {
                try { requestToken(true) } catch { /* ignore */ }
              }
            }, delay)
            return  // keep loading spinner while retry is in flight
          }

          // All silent retries exhausted — try One Tap as final fallback.
          // One Tap uses FedCM (no third-party cookies needed), making it more
          // reliable than the hidden iframe approach used by prompt:'none'.
          if (hasSessionHint() && !oneTapTriggered.current && google?.accounts?.id) {
            oneTapTriggered.current = true
            console.log('[Auth] Attempting One Tap fallback…')
            initOneTapFallback(CLIENT_ID, () => {
              // One Tap fired the callback — the token request is now in-flight.
              // Give it time to resolve before potentially showing login.
              setTimeout(() => {
                if (!useBrainStore.getState().authState.isAuthenticated) {
                  setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
                }
              }, 5000)
            })
            return  // keep loading while One Tap is in progress
          }

          setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
        }

        const didInit = initTokenClient(
          CLIENT_ID,
          (token) => {
            silentRetryCount.current = 0
            setAuthState({ isAuthenticated: true, token, error: null, loading: false })
          },
          (error) => {
            // Only update auth state when not already signed in — a stale silent-request
            // failure arriving after a successful explicit sign-in must not sign the user out.
            if (!useBrainStore.getState().authState.isAuthenticated) {
              setAuthState({ isAuthenticated: false, token: null, error, loading: false })
            }
          },
          // Silent failure: no active session — retry for returning users, then try One Tap.
          safeSignOut,
        )

        if (didInit) {
          // Attempt silent token acquisition via hidden iframe (not a popup — safe on load).
          // If the user has an active Google session and has previously granted consent,
          // this re-authenticates them on every reload without any interaction.
          requestToken(true)
        } else {
          // initTokenClient was already called (useAuth used in multiple components).
          // We're not the owner of the token client — just stop the loading spinner.
          safeSignOut()
        }
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
