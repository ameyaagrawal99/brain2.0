import { useEffect, useCallback, useRef } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { initTokenClient, requestToken, revokeToken, hasSessionHint, initOneTapFallback, loadGisScript } from '@/lib/gsi'
import { getAuthStartupPolicy } from '@/lib/startupPolicy'
import { logger } from '@/lib/logger'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

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

    const isReturning = hasSessionHint()
    const policy = getAuthStartupPolicy(isReturning)
    let cancelled = false
    let oneTapTimer: ReturnType<typeof setTimeout> | null = null
    const retryTimers: ReturnType<typeof setTimeout>[] = []

    if (policy.showLoginImmediately) {
      setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
    }

    loadGisScript()
      .then(() => {
        if (cancelled || initialized.current) return
        initialized.current = true

        // Guard: don't let a stale error/silent-failure callback sign the user out
        // after they've already authenticated (race between silent re-auth and explicit sign-in).
        const safeSignOut = () => {
          if (useBrainStore.getState().authState.isAuthenticated) return

          const delay = policy.silentRetryDelaysMs[silentRetryCount.current]
          if (hasSessionHint() && delay !== undefined) {
            silentRetryCount.current += 1
            logger.info(`[Auth] Silent auth failed, retrying in ${delay}ms`)
            const timer = setTimeout(() => {
              if (!useBrainStore.getState().authState.isAuthenticated) {
                try { requestToken(true) } catch { /* ignore */ }
              }
            }, delay)
            retryTimers.push(timer)
            return  // keep loading spinner while retry is in flight
          }

          // All silent retries exhausted — try One Tap as final fallback.
          // One Tap uses FedCM (no third-party cookies needed), making it more
          // reliable than the hidden iframe approach used by prompt:'none'.
          if (hasSessionHint() && !oneTapTriggered.current && google?.accounts?.id) {
            oneTapTriggered.current = true
            logger.info('[Auth] Attempting One Tap fallback…')
            initOneTapFallback(CLIENT_ID, () => {
              oneTapTimer = setTimeout(() => {
                if (!useBrainStore.getState().authState.isAuthenticated) {
                  setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
                }
              }, policy.oneTapGraceMs)
            })
            oneTapTimer = setTimeout(() => {
              if (!useBrainStore.getState().authState.isAuthenticated) {
                setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
              }
            }, policy.oneTapGraceMs)
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
          if (isReturning) {
            // Attempt silent token acquisition via hidden iframe (not a popup — safe on load).
            // If it fails, the compact retry policy above quickly falls back to explicit sign-in.
            requestToken(true)
          }
        } else {
          // initTokenClient was already called (useAuth is also used by LoginScreen).
          // Avoid starting a second silent-auth retry loop from the non-owner hook.
          if (!useBrainStore.getState().authState.isAuthenticated) {
            setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAuthState({
            isAuthenticated: false,
            token: null,
            error: error instanceof Error ? error.message : 'Failed to load Google sign-in',
            loading: false,
          })
        }
      })

    return () => {
      cancelled = true
      if (oneTapTimer) clearTimeout(oneTapTimer)
      retryTimers.forEach(clearTimeout)
    }
  }, [setAuthState])

  // signIn MUST be called directly from a button onClick
  const signIn = useCallback(async () => {
    try {
      await loadGisScript()
      requestToken(false)
    } catch (e) { console.error(e) }
  }, [])

  const signOut = useCallback(() => {
    revokeToken()
    setAuthState({ isAuthenticated: false, token: null, error: null, loading: false })
  }, [setAuthState])

  return { signIn, signOut }
}
