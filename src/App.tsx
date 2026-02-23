import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useBrainStore } from '@/store/useBrainStore'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { AppShell } from '@/components/layout/AppShell'

export default function App() {
  useAuth()
  useTheme()

  const isAuthenticated = useBrainStore((s) => s.authState.isAuthenticated)
  const selectedRow     = useBrainStore((s) => s.selectedRow)
  const showNewRow      = useBrainStore((s) => s.showNewRow)
  const showSettings    = useBrainStore((s) => s.showSettings)

  // Lock body scroll when any modal is open
  useEffect(() => {
    const locked = !!(selectedRow || showNewRow || showSettings)
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedRow, showNewRow, showSettings])

  return (
    <>
      {isAuthenticated ? <AppShell /> : <LoginScreen />}
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
