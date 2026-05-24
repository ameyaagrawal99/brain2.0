import { Toaster } from 'react-hot-toast'
import { useBrainStore } from '@/store/useBrainStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function App() {
  useAuth()
  useTheme()

  const { isAuthenticated, loading } = useBrainStore((s) => s.authState)
  const demoMode = useBrainStore((s) => s.settings.demoMode)

  // While attempting silent re-auth on reload, show a minimal spinner so the
  // login screen doesn't flash briefly before the token arrives.
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      <ErrorBoundary>
        {isAuthenticated || demoMode ? <AppShell /> : <LoginScreen />}
      </ErrorBoundary>
      <Toaster
        position="bottom-right"
        containerStyle={{ bottom: 24, right: 24 }}
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            background: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text))',
            border: '1px solid rgb(var(--color-border))',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: 'rgb(var(--color-green))', secondary: 'white' } },
          error:   { iconTheme: { primary: 'rgb(var(--color-red))',   secondary: 'white' } },
        }}
      />
    </>
  )
}
