import { BookOpen, Sparkles, Shield, Smartphone, ArrowRight, Brain } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBrainStore } from '@/store/useBrainStore'

const FEATURES = [
  { icon: Brain,       label: 'Knowledge graph',  desc: 'Connect ideas visually' },
  { icon: Sparkles,    label: 'AI-powered',        desc: 'Enhance & summarise' },
  { icon: Shield,      label: 'Private & secure',  desc: 'Your data, your Sheet' },
  { icon: Smartphone,  label: 'Works offline',     desc: 'Installable PWA' },
]

export function LoginScreen() {
  const { signIn } = useAuth()
  const setAuthState = useBrainStore((s) => s.setAuthState)
  const updateSettings = useBrainStore((s) => s.updateSettings)

  function enterDemo() {
    updateSettings({ demoMode: true })
    setAuthState({ isAuthenticated: true, token: null, error: null, loading: false })
  }

  return (
    <div className="app-safe-screen bg-bg flex flex-col items-center justify-center p-5 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-brand/10 to-transparent" />

      <div className="w-full max-w-md relative z-10 animate-fadeIn">

        {/* Logo + hero */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-lg shadow-brand/10">
              <BookOpen className="w-10 h-10 text-brand" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-brand flex items-center justify-center shadow-sm">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">Brain 2.0</h1>
          <p className="text-base text-ink2 mt-2 max-w-xs leading-relaxed">
            Your personal knowledge base — tasks, notes, and ideas, beautifully organised.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border shadow-sm hover:border-brand/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-brand" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink leading-snug">{label}</p>
                <p className="text-[11px] text-ink3 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign-in button */}
        <button
          onClick={signIn}
          className="w-full group flex items-center justify-center gap-3 h-12 px-5 bg-ink text-white border border-ink rounded-xl text-sm font-semibold hover:bg-brand hover:border-brand transition-all shadow-md shadow-brand/10"
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <span className="flex-1 text-left">Continue with Google</span>
          <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={enterDemo}
          className="mt-3 w-full flex items-center justify-center gap-2 h-11 px-5 premium-control rounded-xl text-sm font-semibold text-ink"
        >
          Explore demo
        </button>

        <p className="text-center text-[11px] text-ink3 mt-5 leading-relaxed">
          Your data lives in your own Google Sheet — no external database, no vendor lock-in.
        </p>
      </div>
    </div>
  )
}
