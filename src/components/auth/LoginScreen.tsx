import { BookOpen, Wand2, Shield, Smartphone, ArrowRight, Network } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBrainStore } from '@/store/useBrainStore'

const FEATURES = [
  { icon: Network,     label: 'Linked notes',      desc: 'Wiki-links, backlinks and a graph view' },
  { icon: Wand2,       label: 'AI assist',         desc: 'Titles, tags and summaries on request' },
  { icon: Shield,      label: 'Your own Sheet',    desc: 'No separate database to trust' },
  { icon: Smartphone,  label: 'Installable',       desc: 'Works offline as a PWA' },
]

export function LoginScreen() {
  const { signIn } = useAuth()
  const setAuthState = useBrainStore((s) => s.setAuthState)
  const updateSettings = useBrainStore((s) => s.updateSettings)
  const authError = useBrainStore((s) => s.authState.error)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  function enterDemo() {
    updateSettings({ demoMode: true })
    setAuthState({ isAuthenticated: true, token: null, error: null, loading: false })
  }

  return (
    <div className="app-safe-screen bg-bg flex flex-col items-center justify-center p-5 sm:p-6 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 animate-fadeIn">

        {/* Logo + hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">Brain 2.0</span>
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-tight leading-snug">
            Notes, tasks and milestones, stored in a Google Sheet you own.
          </h1>
        </div>

        {/* Feature list */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-8 border-t border-border pt-5">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <li key={label} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-ink3 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-ink leading-snug">{label}</p>
                <p className="text-[11px] text-ink3 mt-0.5 leading-snug">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Sign-in button */}
        {authError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-left dark:border-red-900/60 dark:bg-red-900/20">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              {clientId ? 'Google sign-in needs attention' : 'Google sign-in is not configured'}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-red-600 dark:text-red-300/80">
              {clientId
                ? authError
                : 'The app needs VITE_GOOGLE_CLIENT_ID before live Google Sheets sync can start.'}
            </p>
          </div>
        )}

        <button
          onClick={signIn}
          disabled={!clientId}
          className="w-full group flex items-center justify-center gap-3 h-12 px-5 bg-ink text-surface border border-ink rounded-lg text-sm font-semibold hover:bg-brand hover:border-brand transition-colors disabled:opacity-50 disabled:hover:bg-ink disabled:hover:border-ink"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <span className="flex-1 text-left">Continue with Google</span>
          <ArrowRight className="w-4 h-4 text-surface/70 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={enterDemo}
          className="mt-3 w-full flex items-center justify-center gap-2 h-11 px-5 premium-control rounded-lg text-sm font-semibold text-ink"
        >
          Explore demo
        </button>

        <p className="text-center text-[11px] text-ink3 mt-5 leading-relaxed">
          The demo uses sample entries and never connects to Google Sheets.
        </p>
      </div>
    </div>
  )
}
